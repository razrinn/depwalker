// Markdown format plugin for DepWalker

import type { AnalysisResult } from '../../types.js';
import type { FormatPlugin } from '../types.js';
import {
  truncatePath,
  buildImpactedItems,
  calculateStats,
} from '../shared/utils.js';
import { collectEntryPoints, groupEntryPointsByFile, type EntryPoint } from '../shared/tree-builder.js';
import { TEST_PRIORITY_THRESHOLDS } from '../../constants.js';

/**
 * Markdown format plugin - generates compact markdown reports
 */
export class MarkdownFormatPlugin implements FormatPlugin {
  readonly name = 'markdown';
  readonly extension = 'md';
  readonly contentType = 'text/markdown';

  generate(result: AnalysisResult, maxDepth: number | null): string {
    const { changedFiles, changedFunctions, callGraph } = result;

    const lines: string[] = [];

    const impactedItems = buildImpactedItems(changedFunctions, callGraph);
    const stats = calculateStats(changedFiles, impactedItems);

    // Header with inline summary
    lines.push('# Impact Analysis');
    lines.push('');

    const summaryParts: string[] = [];
    if (stats.critical > 0) summaryParts.push(`🔴 ${stats.critical} critical`);
    if (stats.high > 0) summaryParts.push(`🟠 ${stats.high} high`);
    if (stats.medium > 0) summaryParts.push(`🟡 ${stats.medium} medium`);
    if (stats.low > 0) summaryParts.push(`🟢 ${stats.low} low`);
    if (stats.none > 0) summaryParts.push(`⚪ ${stats.none} none`);

    lines.push(`**${stats.changedFiles} file${stats.changedFiles !== 1 ? 's' : ''} changed · ${stats.changedFunctions} node${stats.changedFunctions !== 1 ? 's' : ''}**`);
    if (summaryParts.length > 0) {
      lines.push(summaryParts.join(' · '));
    }
    lines.push('');

    // Changed Nodes table (all items, not just top 5)
    if (impactedItems.length > 0) {
      lines.push('## Changed Nodes');
      lines.push('');
      lines.push('| Node | File | Impact | Dependents | Depth |');
      lines.push('|------|------|--------|------------|-------|');
      for (const item of impactedItems) {
        const emoji = item.impactLevel === 'critical' ? '🔴' :
          item.impactLevel === 'high' ? '🟠' :
            item.impactLevel === 'medium' ? '🟡' :
              item.impactLevel === 'low' ? '🟢' : '⚪';
        lines.push(`| **${item.name}** | \`${truncatePath(item.file)}:${item.line}\` | ${emoji} ${item.score} | ${item.dependents} | ${item.depth} |`);
      }
      lines.push('');
    }

    // Entry Points
    lines.push('## Entry Points');
    lines.push('');

    const allEntryPoints: Array<EntryPoint & { changedFunc: string }> = [];
    for (const [, funcIds] of changedFunctions) {
      for (const funcId of funcIds) {
        const eps = collectEntryPoints(funcId, callGraph, maxDepth);
        for (const ep of eps) {
          allEntryPoints.push({ ...ep, changedFunc: funcId });
        }
      }
    }

    // Deduplicate
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
      lines.push('*No entry points found — your changes may not affect any testable code paths.*');
    } else {
      lines.push('| Entry Point | File | Depth |');
      lines.push('|-------------|------|-------|');

      for (const ep of sortedEntryPoints) {
        const depthLabel = ep.depth === 0 ? 'direct' : `${ep.depth} level${ep.depth > 1 ? 's' : ''}`;
        lines.push(`| \`${ep.name}\` | \`${truncatePath(ep.file)}:${ep.line}\` | ${depthLabel} |`);
      }
      lines.push('');
      lines.push(`${sortedEntryPoints.length} entry point${sortedEntryPoints.length > 1 ? 's' : ''} to test`);
    }

    return lines.join('\n');
  }
}

// Export singleton instance
export const markdownFormatPlugin = new MarkdownFormatPlugin();
