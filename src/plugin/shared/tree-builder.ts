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
 * Entry point information for testing
 */
export interface EntryPoint {
  id: string;
  name: string;
  file: string;
  line: number;
  depth: number; // How many levels from changed function to this entry point
  path: string[]; // Chain of function IDs from changed function up to this entry point
}

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
      .map(c => buildTreeData(c.callerId, callGraph, maxDepth, currentDepth + 1, new Set(visited)))
      .filter(Boolean) ?? []) as TreeNode[],
  };
}

/**
 * Collect all entry points (leaf nodes) from the impact tree
 * Entry points are functions with no callers - these are the "test targets"
 */
export function collectEntryPoints(
  funcId: string,
  callGraph: CallGraph,
  maxDepth: number | null = null,
  visited = new Set<string>(),
  currentPath: string[] = []
): EntryPoint[] {
  if (visited.has(funcId) || (maxDepth !== null && currentPath.length >= maxDepth)) {
    return [];
  }

  const node = callGraph.get(funcId);
  if (!node) return [];

  visited.add(funcId);
  const newPath = [...currentPath, funcId];

  // If no callers, this is an entry point
  if (node.callers.length === 0) {
    const parts = funcId.split(':');
    return [{
      id: funcId,
      name: parts[1] || 'unknown',
      file: parts[0] || 'unknown',
      line: node.definition.startLine,
      depth: currentPath.length,
      path: newPath,
    }];
  }

  // Otherwise, recurse into callers
  const entryPoints: EntryPoint[] = [];
  for (const caller of node.callers) {
    const callerEntryPoints = collectEntryPoints(
      caller.callerId,
      callGraph,
      maxDepth,
      new Set(visited),
      newPath
    );
    entryPoints.push(...callerEntryPoints);
  }

  return entryPoints;
}

/**
 * Build a reverse tree showing the path from entry point down to changed function
 * This helps users understand "if I test this entry point, I'm testing my change"
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
 * Build reverse tree from entry point down to the target function
 * Shows: Entry Point → ... → Intermediate → Target Function
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

  // Find path from entry point to target
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
 * Group entry points by file for easier navigation
 */
export function groupEntryPointsByFile(entryPoints: EntryPoint[]): Map<string, EntryPoint[]> {
  const groups = new Map<string, EntryPoint[]>();
  for (const ep of entryPoints) {
    if (!groups.has(ep.file)) {
      groups.set(ep.file, []);
    }
    groups.get(ep.file)!.push(ep);
  }
  // Sort each group by depth (deepest first = most specific paths)
  for (const [, points] of groups) {
    points.sort((a, b) => b.depth - a.depth);
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
