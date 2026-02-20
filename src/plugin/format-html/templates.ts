// HTML templates for format-html plugin

import type { TreeNode, EntryPoint } from '../shared/tree-builder.js';
import type { ImpactedItem, ReportStats } from '../shared/utils.js';
import { truncatePath } from '../shared/utils.js';
import { TEST_PRIORITY_THRESHOLDS } from '../../constants.js';

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Render a tree node recursively as HTML
 */
function renderTreeNode(node: TreeNode, visited = new Set<string>()): string {
  if (visited.has(node.id)) {
    const shortFile = node.file.split('/').pop() ?? node.file;
    return `<div class="tree-node">
      <div class="tree-row tree-circular">
        <span class="tree-toggle">&middot;</span>
        <span class="tree-label">↺ ${escapeHtml(node.name)}</span>
        <span class="tree-location">${escapeHtml(shortFile)}:${node.line}</span>
      </div>
    </div>`;
  }

  visited.add(node.id);

  const hasChildren = node.children.length > 0;
  const shortFile = node.file.split('/').pop() ?? node.file;
  const toggle = hasChildren
    ? `<span class="tree-toggle" onclick="toggleNode(this)">▼</span>`
    : `<span class="tree-toggle">&middot;</span>`;

  let childrenHtml = '';
  if (hasChildren) {
    const childNodes = node.children
      .map(child => renderTreeNode(child, visited))
      .join('');
    childrenHtml = `<div class="tree-children">${childNodes}</div>`;
  }

  return `<div class="tree-node">
    <div class="tree-row">
      ${toggle}
      <span class="tree-label">${escapeHtml(node.name)}</span>
      <span class="tree-location">${escapeHtml(shortFile)}:${node.line}</span>
    </div>
    ${childrenHtml}
  </div>`;
}

/**
 * Render the changed nodes section
 */
export function renderChangedNodes(
  items: ImpactedItem[],
  treeLookup: Map<string, TreeNode | null>
): string {
  if (items.length === 0) {
    return '<p class="no-deps">No changed functions detected.</p>';
  }

  return items.map(item => {
    const impactEmoji = item.impactLevel === 'critical' ? '🔴' :
      item.impactLevel === 'high' ? '🟠' :
        item.impactLevel === 'medium' ? '🟡' :
          item.impactLevel === 'low' ? '🟢' : '⚪';

    const treeNode = treeLookup.get(item.funcId);
    let treeHtml: string;

    if (treeNode && treeNode.children.length > 0) {
      const treeContent = treeNode.children
        .map(child => renderTreeNode(child))
        .join('');
      treeHtml = `<div class="tree">${treeContent}</div>`;
    } else {
      treeHtml = '<div class="no-deps">No dependents — safe to change</div>';
    }

    return `<div class="node-card">
      <div class="node-header">
        <span class="impact-badge ${item.impactLevel}">${impactEmoji} ${item.score}</span>
        <span class="node-name">${escapeHtml(item.name)}</span>
        <span class="node-file">${escapeHtml(truncatePath(item.file))}:${item.line}</span>
      </div>
      ${treeHtml}
    </div>`;
  }).join('');
}

/**
 * Render the entry points table
 */
export function renderEntryPoints(entryPoints: EntryPoint[]): string {
  if (entryPoints.length === 0) {
    return '<p class="no-deps">No entry points found.</p>';
  }

  const rows = entryPoints.map(ep => {
    const priority = ep.depth >= TEST_PRIORITY_THRESHOLDS.high ? '🔴 High' :
      ep.depth >= TEST_PRIORITY_THRESHOLDS.medium ? '🟡 Medium' : '🟢 Low';
    const depthLabel = ep.depth === 0 ? 'direct' : `${ep.depth} level${ep.depth > 1 ? 's' : ''}`;

    return `<tr>
      <td>${escapeHtml(ep.name)}</td>
      <td>${escapeHtml(truncatePath(ep.file))}:${ep.line}</td>
      <td>${depthLabel}</td>
      <td>${priority}</td>
    </tr>`;
  }).join('');

  return `<table class="entry-table">
    <thead>
      <tr>
        <th>Entry Point</th>
        <th>File</th>
        <th>Depth</th>
        <th>Priority</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="entry-count">${entryPoints.length} entry point${entryPoints.length > 1 ? 's' : ''} to test</div>`;
}

/**
 * Render the summary badges
 */
export function renderSummary(stats: ReportStats): string {
  const badges: string[] = [];

  const levels: Array<{ key: keyof ReportStats; label: string; level: string }> = [
    { key: 'critical', label: 'Critical', level: 'critical' },
    { key: 'high', label: 'High', level: 'high' },
    { key: 'medium', label: 'Medium', level: 'medium' },
    { key: 'low', label: 'Low', level: 'low' },
    { key: 'none', label: 'None', level: 'none' },
  ];

  for (const { key, label, level } of levels) {
    const count = stats[key];
    if (typeof count === 'number' && count > 0) {
      badges.push(`<span class="badge"><span class="badge-dot ${level}"></span>${count} ${label}</span>`);
    }
  }

  return badges.join('');
}

/**
 * Render the full HTML page
 */
export function renderHtml(
  version: string,
  styles: string,
  stats: ReportStats,
  summaryHtml: string,
  changedNodesHtml: string,
  entryPointsHtml: string,
  scripts: string
): string {
  const totalDependents = ''; // computed in index.ts and passed via stats text
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Depwalker v${escapeHtml(version)} — Impact Analysis</title>
  <style>${styles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Impact Analysis <span style="font-weight:400;color:#9ca3af;font-size:14px">v${escapeHtml(version)}</span></h1>
      <div class="header-meta">${stats.changedFiles} file${stats.changedFiles !== 1 ? 's' : ''} &middot; ${stats.changedFunctions} change${stats.changedFunctions !== 1 ? 's' : ''}</div>
    </div>

    <div class="summary">
      ${summaryHtml}
    </div>

    <div class="section">
      <div class="section-title">Changed Nodes</div>
      ${changedNodesHtml}
    </div>

    <div class="section">
      <div class="section-title">Entry Points to Test</div>
      ${entryPointsHtml}
    </div>
  </div>
  <script>${scripts}</script>
</body>
</html>`;
}
