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
