// Markdown format plugin for DepWalker

import type { AnalysisResult } from '../../types.js';
import type { FormatPlugin } from '../types.js';
import {
  truncatePath,
  buildImpactedItems,
  calculateStats,
} from '../shared/utils.js';
import { collectEntryPoints, refineTestTargets, type TestTarget } from '../shared/tree-builder.js';
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

    // Changed Nodes table — split into impactful vs no-impact
    if (impactedItems.length > 0) {
      const withDeps = impactedItems.filter(i => i.dependents > 0);
      const noDeps = impactedItems.filter(i => i.dependents === 0);

      lines.push('## Changed Nodes');
      lines.push('');

      if (withDeps.length > 0) {
        lines.push('| Node | File | Impact | Dependents | Depth |');
        lines.push('|------|------|--------|------------|-------|');
        for (const item of withDeps) {
          const emoji = item.impactLevel === 'critical' ? '🔴' :
            item.impactLevel === 'high' ? '🟠' :
              item.impactLevel === 'medium' ? '🟡' :
                item.impactLevel === 'low' ? '🟢' : '⚪';
          lines.push(`| **${item.name}** | \`${truncatePath(item.file)}:${item.line}\` | ${emoji} ${item.score} | ${item.dependents} | ${item.depth} |`);
        }
        lines.push('');
      }

      if (noDeps.length > 0) {
        const names = noDeps.map(i => `\`${i.name}\``).join(', ');
        lines.push(`⚪ ${noDeps.length} node${noDeps.length > 1 ? 's' : ''} with no dependents: ${names}`);
        lines.push('');
      }
    }

    // Test Targets
    lines.push('## Test Targets');
    lines.push('');

    const allTargets: TestTarget[] = [];
    const changedFuncIds = new Set<string>();
    for (const [, funcIds] of changedFunctions) {
      for (const funcId of funcIds) {
        changedFuncIds.add(funcId);
        allTargets.push(...collectEntryPoints(funcId, callGraph, maxDepth));
      }
    }

    const sortedTargets = refineTestTargets(allTargets, changedFuncIds);

    if (sortedTargets.length === 0) {
      lines.push('*No test targets found — your changes may not affect any testable code paths.*');
    } else {
      lines.push('| Test Target | File | Depth | Covers | Priority |');
      lines.push('|-------------|------|-------|--------|----------|');

      for (const t of sortedTargets) {
        const depthLabel = t.depth === 1 ? 'direct' : `${t.depth} levels`;
        const coversLabel = t.covers.map(c => `\`${c.split(':')[1] || c}\``).join(', ');
        const priority = t.depth <= TEST_PRIORITY_THRESHOLDS.high ? '🔴 High' :
          t.depth <= TEST_PRIORITY_THRESHOLDS.medium ? '🟡 Medium' : '🟢 Low';
        lines.push(`| \`${t.name}\` | \`${truncatePath(t.file)}:${t.line}\` | ${depthLabel} | ${coversLabel} | ${priority} |`);
      }
      lines.push('');
      lines.push(`${sortedTargets.length} test target${sortedTargets.length > 1 ? 's' : ''}`);
    }

    return lines.join('\n');
  }
}

// Export singleton instance
export const markdownFormatPlugin = new MarkdownFormatPlugin();
