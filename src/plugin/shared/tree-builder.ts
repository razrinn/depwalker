// Tree building utilities for impact visualization

import type { CallGraph } from '../../types.js';
import { groupCallersByFile, truncatePath } from './utils.js';

/**
 * Tree node for hierarchical impact display
 */
export interface TreeNode {
  id: string;
  name: string;
  file: string;
  line: number;
  isCircular: boolean;
  children: TreeNode[];
}

/**
 * Test target information — functions with no callers that transitively depend on a changed function
 */
export interface TestTarget {
  id: string;
  name: string;
  file: string;
  line: number;
  depth: number; // How many levels from changed function to this test target (BFS shortest path)
  path: string[]; // Shortest chain of function IDs from changed function up to this test target
  /** Changed function IDs that this test target covers (populated during dedup in plugins) */
  covers: string[];
}

/** @deprecated Use TestTarget instead */
export type EntryPoint = TestTarget;

/**
 * Build impact tree data structure for visualization
 */
export function buildTreeData(
  funcId: string,
  callGraph: CallGraph,
  maxDepth: number | null = null,
  currentDepth = 0,
  visited = new Set<string>()
): TreeNode | null {
  if (visited.has(funcId) || (maxDepth !== null && currentDepth >= maxDepth)) {
    return null;
  }
  visited.add(funcId);

  const node = callGraph.get(funcId);
  const parts = funcId.split(':');
  const name = parts[1] || 'unknown';
  const file = parts[0] || 'unknown';

  return {
    id: funcId,
    name,
    file,
    line: node?.definition.startLine ?? 0,
    isCircular: visited.has(funcId),
    children: (node?.callers
      .map(c => buildTreeData(c.callerId, callGraph, maxDepth, currentDepth + 1, visited))
      .filter(Boolean) ?? []) as TreeNode[],
  };
}

/**
 * Collect all test targets (root callers) from the impact tree using BFS.
 * Test targets are functions with no callers that transitively depend on the changed function.
 * BFS guarantees shortest path discovery and uses a single visited set (no per-branch cloning).
 * Self-references (the changed function itself appearing as depth 0) are excluded.
 */
export function collectEntryPoints(
  funcId: string,
  callGraph: CallGraph,
  maxDepth: number | null = null,
): TestTarget[] {
  const startNode = callGraph.get(funcId);
  if (!startNode) return [];

  // If the changed function itself has no callers, there are no test targets
  // (the "Changed Nodes" table already shows it as "No Impact")
  if (startNode.callers.length === 0) return [];

  const visited = new Set<string>([funcId]);
  const results: TestTarget[] = [];

  // BFS queue: each item is [currentFuncId, path from changed func]
  const queue: Array<[string, string[]]> = [];

  // Seed with direct callers
  for (const caller of startNode.callers) {
    if (!visited.has(caller.callerId)) {
      visited.add(caller.callerId);
      queue.push([caller.callerId, [funcId, caller.callerId]]);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const [currentId, path] = queue[head++]!;
    const depth = path.length - 1; // depth = edges from changed func

    if (maxDepth !== null && depth > maxDepth) continue;

    const node = callGraph.get(currentId);
    if (!node) continue;

    if (node.callers.length === 0) {
      // No callers — this is a test target (root of the call chain)
      const parts = currentId.split(':');
      results.push({
        id: currentId,
        name: parts[1] || 'unknown',
        file: parts[0] || 'unknown',
        line: node.definition.startLine,
        depth,
        path,
        covers: [funcId], // the changed function this BFS started from
      });
      continue;
    }

    // Enqueue callers for further exploration
    for (const caller of node.callers) {
      if (!visited.has(caller.callerId)) {
        visited.add(caller.callerId);
        queue.push([caller.callerId, [...path, caller.callerId]]);
      }
    }
  }

  return results;
}

/**
 * Deduplicate test targets, filter out changed functions, and sort by depth.
 *
 * The BFS roots from collectEntryPoints() are already the correct test targets
 * (functions with no callers). This function merges duplicates (keeping shortest
 * path), removes any target that is itself a changed function (already shown in
 * Changed Nodes), and sorts by depth ascending (closest = highest priority).
 *
 * @param allTargets - Raw targets from all collectEntryPoints() calls (before dedup)
 * @param changedFuncIds - IDs of changed functions to exclude from targets
 * @returns Deduplicated, filtered, sorted test targets
 */
export function refineTestTargets(
  allTargets: TestTarget[],
  changedFuncIds: Set<string>,
): TestTarget[] {
  // Dedup: merge covers, keep shortest path
  const unique = new Map<string, TestTarget>();
  for (const t of allTargets) {
    // Filter out targets that are themselves changed functions
    if (changedFuncIds.has(t.id)) continue;

    const existing = unique.get(t.id);
    if (!existing) {
      unique.set(t.id, { ...t, covers: [...t.covers] });
    } else {
      for (const c of t.covers) {
        if (!existing.covers.includes(c)) existing.covers.push(c);
      }
      if (t.depth < existing.depth) {
        existing.depth = t.depth;
        existing.path = t.path;
      }
    }
  }

  return Array.from(unique.values()).sort((a, b) => a.depth - b.depth);
}

/**
 * Build a reverse tree showing the path from test target down to changed function
 * This helps users understand "if I test this target, I'm testing my change"
 */
export interface ReverseTreeNode {
  id: string;
  name: string;
  file: string;
  line: number;
  isTarget: boolean; // true if this is the changed function being analyzed
  children: ReverseTreeNode[];
}

/**
 * Build reverse tree from test target down to the changed function
 * Shows: Test Target → ... → Intermediate → Changed Function
 */
export function buildReverseTree(
  entryPointId: string,
  targetFuncId: string,
  callGraph: CallGraph
): ReverseTreeNode | null {
  // Build a reverse mapping: callee -> callers
  const calleeToCallers = new Map<string, Array<{ id: string; line: number }>>();
  
  for (const [funcId, info] of callGraph) {
    for (const caller of info.callers) {
      if (!calleeToCallers.has(funcId)) {
        calleeToCallers.set(funcId, []);
      }
      calleeToCallers.get(funcId)!.push({ id: caller.callerId, line: caller.line });
    }
  }

  // Build child mapping (caller -> callees) by reversing the call graph
  const callerToCallees = new Map<string, Array<{ id: string; line: number }>>();
  for (const [funcId, info] of callGraph) {
    for (const caller of info.callers) {
      if (!callerToCallees.has(caller.callerId)) {
        callerToCallees.set(caller.callerId, []);
      }
      callerToCallees.get(caller.callerId)!.push({ id: funcId, line: caller.line });
    }
  }

  // Find path from test target to changed function
  const path = findPathToTarget(entryPointId, targetFuncId, callerToCallees, new Set());
  if (!path) return null;

  // Build tree from path
  return buildTreeFromPath(path, callGraph, targetFuncId);
}

function findPathToTarget(
  currentId: string,
  targetId: string,
  callerToCallees: Map<string, Array<{ id: string; line: number }>>,
  visited: Set<string>
): string[] | null {
  if (currentId === targetId) return [targetId];
  if (visited.has(currentId)) return null;
  visited.add(currentId);

  const callees = callerToCallees.get(currentId) || [];
  for (const callee of callees) {
    const path = findPathToTarget(callee.id, targetId, callerToCallees, new Set(visited));
    if (path) return [currentId, ...path];
  }

  return null;
}

function buildTreeFromPath(
  path: string[],
  callGraph: CallGraph,
  targetFuncId: string
): ReverseTreeNode {
  const funcId = path[0]!;
  const parts = funcId.split(':');
  const funcInfo = callGraph.get(funcId);

  return {
    id: funcId,
    name: parts[1] || 'unknown',
    file: parts[0] || 'unknown',
    line: funcInfo?.definition.startLine ?? 0,
    isTarget: funcId === targetFuncId,
    children: path.length > 1 ? [buildTreeFromPath(path.slice(1), callGraph, targetFuncId)] : [],
  };
}

/**
 * Group test targets by file for easier navigation
 */
export function groupTestTargetsByFile(targets: TestTarget[]): Map<string, TestTarget[]> {
  const groups = new Map<string, TestTarget[]>();
  for (const t of targets) {
    if (!groups.has(t.file)) {
      groups.set(t.file, []);
    }
    groups.get(t.file)!.push(t);
  }
  // Sort each group by depth ascending (closest first = highest priority)
  for (const [, points] of groups) {
    points.sort((a, b) => a.depth - b.depth);
  }
  return groups;
}

/**
 * Build impact tree for markdown format
 */
export function buildImpactTree(
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
