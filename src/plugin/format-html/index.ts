// HTML format plugin for DepWalker — single-page minimal design

import type { AnalysisResult } from '../../types.js';
import type { FormatPlugin } from '../types.js';
import {
  buildImpactedItems,
  calculateStats,
} from '../shared/utils.js';
import { buildTreeData, collectEntryPoints, refineTestTargets, type TestTarget, type TreeNode } from '../shared/tree-builder.js';
import { styles } from './styles.js';
import { renderHtml, renderSummary, renderChangedNodes, renderTestTargets } from './templates.js';
import { generateScripts } from './scripts.js';

/**
 * HTML format plugin — generates a single-page static HTML report
 */
export class HtmlFormatPlugin implements FormatPlugin {
  readonly name = 'html';
  readonly extension = 'html';
  readonly contentType = 'text/html';

  generate(result: AnalysisResult, maxDepth: number | null): string {
    const { changedFiles, changedFunctions, callGraph } = result;

    const impactedItems = buildImpactedItems(changedFunctions, callGraph);
    const stats = calculateStats(changedFiles, impactedItems);

    // Build tree data for each changed function
    const treeLookup = new Map<string, TreeNode | null>();
    for (const item of impactedItems) {
      treeLookup.set(item.funcId, buildTreeData(item.funcId, callGraph, maxDepth));
    }

    // Collect all test targets, then deduplicate and filter out changed functions
    const allTargets: TestTarget[] = [];
    for (const item of impactedItems) {
      allTargets.push(...collectEntryPoints(item.funcId, callGraph, maxDepth));
    }
    const changedFuncIds = new Set(impactedItems.map(item => item.funcId));
    const testTargets = refineTestTargets(allTargets, changedFuncIds);

    const VERSION = process.env.PKG_VERSION || '0.0.0';

    const summaryHtml = renderSummary(stats);
    const changedNodesHtml = renderChangedNodes(impactedItems, treeLookup);
    const testTargetsHtml = renderTestTargets(testTargets);
    const scripts = generateScripts();

    return renderHtml(VERSION, styles, stats, summaryHtml, changedNodesHtml, testTargetsHtml, scripts);
  }
}

// Export singleton instance
export const htmlFormatPlugin = new HtmlFormatPlugin();
