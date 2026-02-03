// Shared utilities for format plugins

import path from 'path';
import type { CallGraph, CallSite, LazyImport } from '../../types.js';

/** Impact level based on combined score */
export type ImpactLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';

/** Impact score calculation result */
export interface ImpactScore {
  score: number;
  breadth: number;
  depth: number;
}

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
export function collectAllDependents(
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
 * Calculate the maximum depth of the impact chain (how far up the call stack changes propagate)
 */
export function getMaxImpactDepth(
  functionId: string,
  callGraph: CallGraph,
  visited = new Set<string>(),
  currentDepth = 0
): number {
  if (visited.has(functionId)) {
    return currentDepth; // Stop at circular reference
  }

  const node = callGraph.get(functionId);
  if (!node || node.callers.length === 0) {
    return currentDepth;
  }

  visited.add(functionId);

  let maxDepth = currentDepth;
  for (const caller of node.callers) {
    const depth = getMaxImpactDepth(caller.callerId, callGraph, new Set(visited), currentDepth + 1);
    maxDepth = Math.max(maxDepth, depth);
  }

  return maxDepth;
}

/**
 * Calculate impact score based on breadth (number of dependents) and depth (call chain length)
 * Depth is weighted more heavily as deeper chains indicate more systemic impact
 */
export function calculateImpactScore(
  functionId: string,
  callGraph: CallGraph
): ImpactScore {
  const dependents = collectAllDependents(functionId, callGraph, null);
  const breadth = dependents.length;
  const depth = getMaxImpactDepth(functionId, callGraph);

  // Score formula: breadth + (depth * 3)
  // Depth weighted 3x because a 5-level deep chain is more concerning than 5 sibling callers
  const score = breadth + (depth * 3);

  return { score, breadth, depth };
}

/**
 * Get impact level based on combined score
 * Thresholds: Critical (20+), High (10-19), Medium (4-9), Low (1-3), None (0)
 */
export function getImpactLevel(score: number): ImpactLevel {
  if (score >= 20) return 'critical';
  if (score >= 10) return 'high';
  if (score >= 4) return 'medium';
  if (score > 0) return 'low';
  return 'none';
}

/**
 * Get impact level display label with emoji
 */
export function getImpactLabel(level: ImpactLevel): string {
  const labels: Record<ImpactLevel, string> = {
    critical: '🔴 Critical',
    high: '🟠 High',
    medium: '🟡 Medium',
    low: '🟢 Low',
    none: '⚪ None',
  };
  return labels[level];
}

/**
 * Group callers by file
 */
export function groupCallersByFile(
  callers: CallSite[]
): Map<string, Array<{ name: string; line: number }>> {
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
 * Impact item data structure for formatters
 */
export interface ImpactedItem {
  name: string;
  file: string;
  funcId: string;
  dependents: number;
  depth: number;
  score: number;
  impactLevel: ImpactLevel;
  line: number;
  callers: CallSite[];
  lazyImports?: LazyImport[] | undefined;
}

/**
 * Build impacted items list from analysis result
 */
export function buildImpactedItems(
  changedFunctions: Map<string, Set<string>>,
  callGraph: CallGraph
): ImpactedItem[] {
  const items: ImpactedItem[] = [];

  for (const [filePath, funcIds] of changedFunctions) {
    for (const funcId of funcIds) {
      const { score, breadth, depth } = calculateImpactScore(funcId, callGraph);
      const impactLevel = getImpactLevel(score);
      const name = funcId.split(':')[1] || 'unknown';
      const funcInfo = callGraph.get(funcId);
      const line = funcInfo?.definition.startLine ?? 0;

      items.push({
        name,
        file: filePath,
        funcId,
        dependents: breadth,
        depth,
        score,
        impactLevel,
        line,
        callers: funcInfo?.callers ?? [],
        lazyImports: funcInfo?.lazyImports,
      });
    }
  }

  // Sort by impact score (descending)
  items.sort((a, b) => b.score - a.score);
  return items;
}

/**
 * Stats for report generation
 */
export interface ReportStats {
  changedFiles: number;
  changedFunctions: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  none: number;
}

/**
 * Calculate stats from impacted items
 */
export function calculateStats(
  changedFiles: string[],
  impactedItems: ImpactedItem[]
): ReportStats {
  return {
    changedFiles: changedFiles.length,
    changedFunctions: impactedItems.length,
    critical: impactedItems.filter(i => i.impactLevel === 'critical').length,
    high: impactedItems.filter(i => i.impactLevel === 'high').length,
    medium: impactedItems.filter(i => i.impactLevel === 'medium').length,
    low: impactedItems.filter(i => i.impactLevel === 'low').length,
    none: impactedItems.filter(i => i.impactLevel === 'none').length,
  };
}
