// Markdown format plugin for DepWalker

import type { AnalysisResult } from '../../types.js';
import type { FormatPlugin } from '../types.js';
import {
  truncatePath,
  buildImpactedItems,
  calculateStats,
  getImpactLabel,
  calculateImpactScore,
  getImpactLevel,
} from '../shared/utils.js';
import { buildImpactTree, collectEntryPoints, groupEntryPointsByFile, type EntryPoint } from '../shared/tree-builder.js';
import { TEST_PRIORITY_THRESHOLDS } from '../../constants.js';

/**
 * Markdown format plugin - generates markdown reports
 */
export class MarkdownFormatPlugin implements FormatPlugin {
  readonly name = 'markdown';
  readonly extension = 'md';
  readonly contentType = 'text/markdown';

  generate(result: AnalysisResult, maxDepth: number | null): string {
    const { changedFiles, changedFunctions, callGraph } = result;

    const lines: string[] = [];

    // Build data using shared utilities
    const impactedItems = buildImpactedItems(changedFunctions, callGraph);
    const stats = calculateStats(changedFiles, impactedItems);

    // Header
    lines.push('# Dependency Impact Analysis');
    lines.push('');

    lines.push('## Summary');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Changed Files | ${stats.changedFiles} |`);
    lines.push(`| Changed Functions | ${stats.changedFunctions} |`);
    lines.push(`| 🔴 Critical Impact (score 20+) | ${stats.critical} |`);
    lines.push(`| 🟠 High Impact (score 10-19) | ${stats.high} |`);
    lines.push(`| 🟡 Medium Impact (score 4-9) | ${stats.medium} |`);
    lines.push(`| 🟢 Low Impact (score 1-3) | ${stats.low} |`);
    lines.push(`| ⚪ No Impact | ${stats.none} |`);
    lines.push('');

    // Changed files
    lines.push('## Changed Files');
    lines.push('');
    for (const file of changedFiles) {
      lines.push(`- \`${file}\``);
    }
    lines.push('');

    // Top impacted (items already sorted by score from buildImpactedItems)
    const topImpacted = impactedItems
      .filter(i => i.score > 0)
      .slice(0, 5);

    if (topImpacted.length > 0) {
      lines.push('## Most Impacted Changes');
      lines.push('');
      lines.push(`| Function | File | Score | Dependents | Depth |`);
      lines.push(`|----------|------|-------|------------|-------|`);
      for (const item of topImpacted) {
        const scoreBadge = item.impactLevel === 'critical' ? '🔴' :
          item.impactLevel === 'high' ? '🟠' :
            item.impactLevel === 'medium' ? '🟡' : '🟢';
        lines.push(`| **${item.name}** | \`${truncatePath(item.file)}\` | ${scoreBadge} ${item.score} | ${item.dependents} | ${item.depth} |`);
      }
      lines.push('');
    }

    // Entry Points Summary - What to test
    lines.push('## 🎯 Test These Entry Points');
    lines.push('');
    lines.push('These are the **functions you should test** to verify your changes work correctly:');
    lines.push('');

    const allEntryPoints: Array<EntryPoint & { changedFunc: string; changedFuncName: string }> = [];
    for (const [filePath, funcIds] of changedFunctions) {
      for (const funcId of funcIds) {
        const entryPoints = collectEntryPoints(funcId, callGraph, maxDepth);
        for (const ep of entryPoints) {
          allEntryPoints.push({
            ...ep,
            changedFunc: funcId,
            changedFuncName: funcId.split(':')[1] || 'unknown',
          });
        }
      }
    }

    // Deduplicate entry points by id, keep the shortest depth
    const uniqueEntryPoints = new Map<string, EntryPoint>();
    for (const ep of allEntryPoints) {
      const existing = uniqueEntryPoints.get(ep.id);
      if (!existing || ep.depth < existing.depth) {
        uniqueEntryPoints.set(ep.id, ep);
      }
    }

    const sortedEntryPoints = Array.from(uniqueEntryPoints.values())
      .sort((a, b) => b.depth - a.depth);

    if (sortedEntryPoints.length === 0) {
      lines.push('*No entry points found - your changes may not affect any testable code paths.*');
    } else {
      // Group by file
      const byFile = groupEntryPointsByFile(sortedEntryPoints);
      
      lines.push(`| Entry Point | File | Depth | Test Priority |`);
      lines.push(`|-------------|------|-------|---------------|`);
      
      for (const [file, points] of byFile) {
        for (const ep of points) {
          const priority = ep.depth >= TEST_PRIORITY_THRESHOLDS.high ? '🔴 High' : ep.depth >= TEST_PRIORITY_THRESHOLDS.medium ? '🟡 Medium' : '🟢 Low';
          const depthLabel = ep.depth === 0 ? 'Direct' : `${ep.depth} level${ep.depth > 1 ? 's' : ''}`;
          lines.push(`| **\`${ep.name}\`** | \`${truncatePath(file)}\` | ${depthLabel} | ${priority} |`);
        }
      }
      lines.push('');
      lines.push(`**Total: ${sortedEntryPoints.length} entry point${sortedEntryPoints.length > 1 ? 's' : ''} to test**`);
    }
    lines.push('');

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
          const { score, breadth, depth } = calculateImpactScore(funcId, callGraph);
          const level = getImpactLevel(score);

          // Header with metadata
          lines.push(`#### \`${funcName}\``);
          lines.push('');
          lines.push(`- **Location**: \`${filePath}:${line}\``);
          lines.push(`- **Impact Score**: ${score} (${breadth} dependents × depth factor)`);
          lines.push(`- **Max Chain Depth**: ${depth} levels`);
          lines.push(`- **Impact**: ${getImpactLabel(level)}`);
          lines.push('');

          // Lazy imports
          if (funcInfo?.lazyImports && funcInfo.lazyImports.length > 0) {
            lines.push('**Lazy Imports:**');
            lines.push('');
            for (const lazyImport of funcInfo.lazyImports) {
              lines.push(`- 📦 \`${lazyImport.moduleSpecifier}\` (line ${lazyImport.line})`);
            }
            lines.push('');
          }

          // Entry points for this function
          const funcEntryPoints = collectEntryPoints(funcId, callGraph, maxDepth);
          if (funcEntryPoints.length > 0) {
            lines.push('**Test These Entry Points:**');
            lines.push('');
            const byFile = groupEntryPointsByFile(funcEntryPoints);
            for (const [file, points] of byFile) {
              lines.push(`- 📁 **\`${truncatePath(file)}\`**`);
              for (const ep of points.slice(0, 5)) { // Limit to 5 per file
                const depthLabel = ep.depth === 0 ? '(direct)' : `(${ep.depth} levels)`;
                lines.push(`  - \`${ep.name}\` ${depthLabel}`);
              }
              if (points.length > 5) {
                lines.push(`  - *...and ${points.length - 5} more*`);
              }
            }
            lines.push('');
          }

          // Impact tree (callers)
          if (funcInfo && funcInfo.callers.length > 0) {
            lines.push('**Full Call Chain:**');
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
    lines.push('**Impact Score** = Dependents + (Depth × 3)');
    lines.push('');
    lines.push('**Legend:** 🔴 Critical (20+) | 🟠 High (10-19) | 🟡 Medium (4-9) | 🟢 Low (1-3) | ⚪ None');

    return lines.join('\n');
  }
}

// Export singleton instance
export const markdownFormatPlugin = new MarkdownFormatPlugin();
