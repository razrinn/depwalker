import path from 'path';
import type { AnalysisResult, CallGraph } from './types.js';

// Colors for terminal output (only used when not markdown mode)
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  green: '\x1b[32m',
  red: '\x1b[31m',
};

/**
 * Truncate path for display
 */
export function truncatePath(filePath: string, numDirs = 2): string {
  const parts = filePath.split(path.sep);
  if (parts.length > numDirs + 1) {
    return '.../' + parts.slice(-numDirs - 1).join(path.sep);
  }
  return filePath;
}

/**
 * Collect all dependents for a function (for summary)
 */
function collectAllDependents(
  functionId: string,
  callGraph: CallGraph,
  maxDepth: number | null = null,
  visited = new Set<string>()
): string[] {
  if (visited.has(functionId) || (maxDepth !== null && visited.size >= maxDepth)) {
    return [];
  }

  visited.add(functionId);
  const dependents: string[] = [];
  const node = callGraph.get(functionId);

  if (node?.callers) {
    for (const caller of node.callers) {
      dependents.push(caller.callerId);
      dependents.push(...collectAllDependents(caller.callerId, callGraph, maxDepth, new Set(visited)));
    }
  }

  return [...new Set(dependents)];
}

/**
 * Group callers by file
 */
function groupCallersByFile(callers: Array<{ callerId: string; line: number }>): Map<string, Array<{ name: string; line: number }>> {
  const groups = new Map<string, Array<{ name: string; line: number }>>();
  
  for (const caller of callers) {
    const parts = caller.callerId.split(':');
    const file = parts[0] || 'unknown';
    const name = parts[1] || 'unknown';
    
    if (!groups.has(file)) {
      groups.set(file, []);
    }
    groups.get(file)!.push({ name, line: caller.line });
  }
  
  // Sort each group by line number
  for (const [, funcs] of groups) {
    funcs.sort((a, b) => a.line - b.line);
  }
  
  return groups;
}

/**
 * Build impact tree for a function (markdown format)
 */
function buildImpactTree(
  functionId: string,
  callGraph: CallGraph,
  maxDepth: number | null,
  currentDepth: number,
  visited: Set<string>,
  prefix: string
): string[] {
  const lines: string[] = [];
  
  if (maxDepth !== null && currentDepth >= maxDepth) {
    lines.push(`${prefix}- *(max depth reached)*`);
    return lines;
  }
  
  if (visited.has(functionId)) {
    const name = functionId.split(':')[1] || 'unknown';
    lines.push(`${prefix}- *(circular: ${name})*`);
    return lines;
  }
  
  const node = callGraph.get(functionId);
  if (!node || node.callers.length === 0) {
    return lines;
  }
  
  visited.add(functionId);
  
  const grouped = groupCallersByFile(node.callers);
  
  for (const [file, funcs] of grouped) {
    if (funcs.length === 1) {
      const func = funcs[0]!;
      const subLines = buildImpactTree(
        `${file}:${func.name}`,
        callGraph,
        maxDepth,
        currentDepth + 1,
        new Set(visited),
        prefix + '  '
      );
      
      if (subLines.length > 0) {
        lines.push(`${prefix}- **${func.name}** (\`${truncatePath(file)}:${func.line}\`)`);
        lines.push(...subLines);
      } else {
        lines.push(`${prefix}- **${func.name}** (\`${truncatePath(file)}:${func.line}\`)`);
      }
    } else {
      // Multiple functions from same file
      const funcList = funcs.map(f => `${f.name}:${f.line}`).join(', ');
      lines.push(`${prefix}- **${funcs.length} functions** in \`${truncatePath(file)}\`: ${funcList}`);
      
      for (const func of funcs) {
        const subLines = buildImpactTree(
          `${file}:${func.name}`,
          callGraph,
          maxDepth,
          currentDepth + 1,
          new Set(visited),
          prefix + '  '
        );
        lines.push(...subLines);
      }
    }
  }
  
  return lines;
}

/**
 * Generate markdown analysis report
 */
export function generateMarkdownReport(
  result: AnalysisResult,
  maxDepth: number | null = null
): string {
  const { changedFiles, changedFunctions, callGraph } = result;
  
  const lines: string[] = [];
  
  // Header
  lines.push('# Dependency Impact Analysis');
  lines.push('');
  
  // Summary section
  const totalFunctions = Array.from(changedFunctions.values()).reduce((sum, set) => sum + set.size, 0);
  
  // Calculate impact stats
  let highImpact = 0;
  let mediumImpact = 0;
  let lowImpact = 0;
  const impactedItems: Array<{ name: string; file: string; dependents: number }> = [];
  
  for (const [filePath, funcIds] of changedFunctions) {
    for (const funcId of funcIds) {
      const depCount = collectAllDependents(funcId, callGraph, null).length;
      if (depCount >= 6) highImpact++;
      else if (depCount >= 3) mediumImpact++;
      else if (depCount > 0) lowImpact++;
      
      const name = funcId.split(':')[1] || 'unknown';
      impactedItems.push({ name, file: filePath, dependents: depCount });
    }
  }
  
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Changed Files | ${changedFiles.length} |`);
  lines.push(`| Changed Functions | ${totalFunctions} |`);
  lines.push(`| High Impact (6+ dependents) | ${highImpact} |`);
  lines.push(`| Medium Impact (3-5) | ${mediumImpact} |`);
  lines.push(`| Low Impact (1-2) | ${lowImpact} |`);
  lines.push(`| No Impact | ${totalFunctions - highImpact - mediumImpact - lowImpact} |`);
  lines.push('');
  
  // Changed files
  lines.push('## Changed Files');
  lines.push('');
  for (const file of changedFiles) {
    lines.push(`- \`${file}\``);
  }
  lines.push('');
  
  // Top impacted
  const topImpacted = impactedItems
    .filter(i => i.dependents > 0)
    .sort((a, b) => b.dependents - a.dependents)
    .slice(0, 5);
  
  if (topImpacted.length > 0) {
    lines.push('## Most Impacted Changes');
    lines.push('');
    lines.push(`| Function | File | Dependents |`);
    lines.push(`|----------|------|------------|`);
    for (const item of topImpacted) {
      lines.push(`| **${item.name}** | \`${truncatePath(item.file)}\` | ${item.dependents} |`);
    }
    lines.push('');
  }
  
  // Detailed impact analysis
  lines.push('## Detailed Impact');
  lines.push('');
  
  if (changedFunctions.size === 0) {
    lines.push('*No changed functions detected.*');
  } else {
    for (const [filePath, funcIds] of changedFunctions) {
      lines.push(`### ${truncatePath(filePath)}`);
      lines.push('');
      
      for (const funcId of funcIds) {
        const funcName = funcId.split(':')[1] || 'unknown';
        const funcInfo = callGraph.get(funcId);
        const line = funcInfo?.definition.startLine;
        const depCount = collectAllDependents(funcId, callGraph, null).length;
        
        // Header with metadata
        lines.push(`#### \`${funcName}\``);
        lines.push('');
        lines.push(`- **Location**: \`${filePath}:${line}\``);
        lines.push(`- **Dependents**: ${depCount}`);
        lines.push(`- **Impact**: ${depCount >= 6 ? '🔴 High' : depCount >= 3 ? '🟡 Medium' : depCount > 0 ? '🟢 Low' : '⚪ None'}`);
        lines.push('');
        
        // Impact tree
        if (funcInfo && funcInfo.callers.length > 0) {
          lines.push('**Impact Chain:**');
          lines.push('');
          const treeLines = buildImpactTree(funcId, callGraph, maxDepth, 0, new Set(), '');
          lines.push(...treeLines.map(l => l || ''));
          lines.push('');
        } else {
          lines.push('*No external callers found.*');
          lines.push('');
        }
      }
    }
  }
  
  // Legend
  lines.push('---');
  lines.push('');
  lines.push('**Legend:** 🔴 High (6+ dependents) | 🟡 Medium (3-5) | 🟢 Low (1-2) | ⚪ None');
  
  return lines.join('\n');
}

/**
 * Print analysis results
 */
export function printResults(
  result: AnalysisResult,
  maxDepth: number | null = null
): void {
  console.log(generateMarkdownReport(result, maxDepth));
}
