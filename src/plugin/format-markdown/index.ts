// Markdown format plugin for DepWalker

import type { AnalysisResult } from '../../types.js';
import type { FormatPlugin } from '../types.js';
import {
  truncatePath,
  buildImpactedItems,
  calculateStats,
  getImpactLevel,
  getImpactLabel,
  calculateImpactScore,
  type ImpactLevel,
} from '../shared/utils.js';
import { buildImpactTree } from '../shared/tree-builder.js';

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

    // Header
    lines.push('# Dependency Impact Analysis');
    lines.push('');

    // Summary section
    const totalFunctions = Array.from(changedFunctions.values()).reduce((sum, set) => sum + set.size, 0);

    // Calculate impact stats using new scoring system
    let criticalImpact = 0;
    let highImpact = 0;
    let mediumImpact = 0;
    let lowImpact = 0;
    const impactedItems: Array<{
      name: string;
      file: string;
      funcId: string;
      dependents: number;
      depth: number;
      score: number;
      level: ImpactLevel;
    }> = [];

    for (const [filePath, funcIds] of changedFunctions) {
      for (const funcId of funcIds) {
        const { score, breadth, depth } = calculateImpactScore(funcId, callGraph);
        const level = getImpactLevel(score);

        if (level === 'critical') criticalImpact++;
        else if (level === 'high') highImpact++;
        else if (level === 'medium') mediumImpact++;
        else if (level === 'low') lowImpact++;

        const name = funcId.split(':')[1] || 'unknown';
        impactedItems.push({
          name,
          file: filePath,
          funcId,
          dependents: breadth,
          depth,
          score,
          level,
        });
      }
    }

    lines.push('## Summary');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Changed Files | ${changedFiles.length} |`);
    lines.push(`| Changed Functions | ${totalFunctions} |`);
    lines.push(`| 🔴 Critical Impact (score 20+) | ${criticalImpact} |`);
    lines.push(`| 🟠 High Impact (score 10-19) | ${highImpact} |`);
    lines.push(`| 🟡 Medium Impact (score 4-9) | ${mediumImpact} |`);
    lines.push(`| 🟢 Low Impact (score 1-3) | ${lowImpact} |`);
    lines.push(`| ⚪ No Impact | ${totalFunctions - criticalImpact - highImpact - mediumImpact - lowImpact} |`);
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
      .filter(i => i.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (topImpacted.length > 0) {
      lines.push('## Most Impacted Changes');
      lines.push('');
      lines.push(`| Function | File | Score | Dependents | Depth |`);
      lines.push(`|----------|------|-------|------------|-------|`);
      for (const item of topImpacted) {
        const scoreBadge = item.level === 'critical' ? '🔴' :
          item.level === 'high' ? '🟠' :
            item.level === 'medium' ? '🟡' : '🟢';
        lines.push(`| **${item.name}** | \`${truncatePath(item.file)}\` | ${scoreBadge} ${item.score} | ${item.dependents} | ${item.depth} |`);
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
    lines.push('**Impact Score** = Dependents + (Depth × 3)');
    lines.push('');
    lines.push('**Legend:** 🔴 Critical (20+) | 🟠 High (10-19) | 🟡 Medium (4-9) | 🟢 Low (1-3) | ⚪ None');

    return lines.join('\n');
  }
}

// Export singleton instance
export const markdownFormatPlugin = new MarkdownFormatPlugin();
