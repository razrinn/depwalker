// HTML format plugin for DepWalker — single-page minimal design

import type { AnalysisResult } from '../../types.js';
import type { FormatPlugin } from '../types.js';
import {
  buildImpactedItems,
  calculateStats,
} from '../shared/utils.js';
import { buildTreeData, collectEntryPoints, type EntryPoint, type TreeNode } from '../shared/tree-builder.js';
import { styles } from './styles.js';
import { renderHtml, renderSummary, renderChangedNodes, renderEntryPoints } from './templates.js';
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

    // Collect all entry points, deduplicated
    const allEntryPoints: EntryPoint[] = [];
    for (const item of impactedItems) {
      allEntryPoints.push(...collectEntryPoints(item.funcId, callGraph, maxDepth));
    }
    const uniqueEntryPoints = new Map<string, EntryPoint>();
    for (const ep of allEntryPoints) {
      const existing = uniqueEntryPoints.get(ep.id);
      if (!existing || ep.depth < existing.depth) {
        uniqueEntryPoints.set(ep.id, ep);
      }
    }
    const entryPointsData = Array.from(uniqueEntryPoints.values()).sort((a, b) => b.depth - a.depth);

    const VERSION = process.env.PKG_VERSION || '0.0.0';

    const summaryHtml = renderSummary(stats);
    const changedNodesHtml = renderChangedNodes(impactedItems, treeLookup);
    const entryPointsHtml = renderEntryPoints(entryPointsData);
    const scripts = generateScripts();

    return renderHtml(VERSION, styles, stats, summaryHtml, changedNodesHtml, entryPointsHtml, scripts);
  }
}

// Export singleton instance
export const htmlFormatPlugin = new HtmlFormatPlugin();
