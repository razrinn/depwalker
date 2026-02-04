// HTML format plugin for DepWalker - Modern Premium Design

import type { AnalysisResult, CallGraph } from '../../types.js';
import type { FormatPlugin } from '../types.js';
import {
  buildImpactedItems,
  calculateStats,
  type ImpactedItem,
} from '../shared/utils.js';
import { buildTreeData, collectEntryPoints, type EntryPoint } from '../shared/tree-builder.js';
import type { FunctionGroup } from './types.js';
import { styles } from './styles.js';
import { renderSidebar, renderMainContent, renderHtml, escapeHtml } from './templates.js';
import { generateScripts } from './scripts.js';

/**
 * HTML format plugin - generates interactive HTML reports with modern premium design
 */
export class HtmlFormatPlugin implements FormatPlugin {
  readonly name = 'html';
  readonly extension = 'html';
  readonly contentType = 'text/html';

  generate(result: AnalysisResult, maxDepth: number | null): string {
    const { changedFiles, changedFunctions, callGraph } = result;

    // Prepare data structures
    const impactedItems = buildImpactedItems(changedFunctions, callGraph);
    
    // Group functions with overlapping dependency graphs
    const functionGroups = this.groupOverlappingFunctions(impactedItems, callGraph);
    
    // Build tree data for all functions (primary and related) in each group
    const treeData: ReturnType<typeof buildTreeData>[] = [];
    for (const group of functionGroups) {
      treeData.push(buildTreeData(group.primary.funcId, callGraph, maxDepth));
      for (const related of group.related) {
        treeData.push(buildTreeData(related.funcId, callGraph, maxDepth));
      }
    }
    
    // Calculate stats based on groups
    const stats = calculateStats(changedFiles, impactedItems);

    // Collect all entry points for testing
    const allEntryPoints: EntryPoint[] = [];
    for (const item of impactedItems) {
      const eps = collectEntryPoints(item.funcId, callGraph, maxDepth);
      allEntryPoints.push(...eps);
    }
    
    // Deduplicate by id, keep shortest depth
    const uniqueEntryPoints = new Map<string, EntryPoint>();
    for (const ep of allEntryPoints) {
      const existing = uniqueEntryPoints.get(ep.id);
      if (!existing || ep.depth < existing.depth) {
        uniqueEntryPoints.set(ep.id, ep);
      }
    }
    const entryPointsData = Array.from(uniqueEntryPoints.values()).sort((a, b) => b.depth - a.depth);

    // Get version from package or use default
    const VERSION = '0.4.0';

    // Render all components
    const sidebarHtml = renderSidebar(functionGroups);
    const mainContentHtml = renderMainContent(stats, functionGroups, entryPointsData);
    const scriptsHtml = generateScripts(treeData, functionGroups, entryPointsData);

    return renderHtml(VERSION, styles, sidebarHtml, mainContentHtml, scriptsHtml);
  }

  /**
   * Group functions that have highly overlapping dependency graphs
   * This happens when multiple functions in the same file are changed
   * and they call each other or share the same call chain
   */
  private groupOverlappingFunctions(
    items: ImpactedItem[],
    callGraph: CallGraph
  ): FunctionGroup[] {
    if (items.length <= 1) {
      return items.map(item => ({ primary: item, related: [], allFuncIds: [item.funcId] }));
    }

    const groups: FunctionGroup[] = [];
    const processed = new Set<string>();

    for (const item of items) {
      if (processed.has(item.funcId)) continue;

      // Find all functions that are in the same file and have overlapping impact
      const related: ImpactedItem[] = [];
      const allFuncIds = [item.funcId];
      
      for (const other of items) {
        if (other.funcId === item.funcId) continue;
        if (processed.has(other.funcId)) continue;

        // Check if they're in the same file
        const sameFile = item.file === other.file;
        
        // Check if one calls the other (direct relationship)
        const itemCallsOther = this.hasCallerRelationship(item.funcId, other.funcId, callGraph);
        const otherCallsItem = this.hasCallerRelationship(other.funcId, item.funcId, callGraph);
        
        // Check if they share significant overlap in dependents (>70%)
        const itemDependents = this.collectAllDependents(item.funcId, callGraph);
        const otherDependents = this.collectAllDependents(other.funcId, callGraph);
        const overlap = this.calculateOverlap(itemDependents, otherDependents);
        const significantOverlap = overlap > 0.7;

        if (sameFile && (itemCallsOther || otherCallsItem || significantOverlap)) {
          related.push(other);
          allFuncIds.push(other.funcId);
          processed.add(other.funcId);
        }
      }

      groups.push({ primary: item, related, allFuncIds });
      processed.add(item.funcId);
    }

    // Sort groups by primary impact score
    groups.sort((a, b) => b.primary.score - a.primary.score);
    
    return groups;
  }

  private hasCallerRelationship(caller: string, callee: string, callGraph: CallGraph): boolean {
    const info = callGraph.get(caller);
    if (!info) return false;
    return info.callers.some(c => c.callerId === callee) || 
           info.callers.some(c => this.hasCallerRelationship(c.callerId, callee, callGraph));
  }

  private collectAllDependents(funcId: string, callGraph: CallGraph, visited = new Set<string>()): Set<string> {
    if (visited.has(funcId)) return visited;
    visited.add(funcId);
    
    const info = callGraph.get(funcId);
    if (info) {
      for (const caller of info.callers) {
        this.collectAllDependents(caller.callerId, callGraph, visited);
      }
    }
    
    return visited;
  }

  private calculateOverlap(setA: Set<string>, setB: Set<string>): number {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }
}

// Export singleton instance
export const htmlFormatPlugin = new HtmlFormatPlugin();
