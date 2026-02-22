// HTML templates for format-html plugin

import type { TreeNode, TestTarget } from '../shared/tree-builder.js';
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

  const withDeps = items.filter(i => i.dependents > 0);
  const noDeps = items.filter(i => i.dependents === 0);

  let html = withDeps.map(item => {
    const impactEmoji = item.impactLevel === 'critical' ? '🔴' :
      item.impactLevel === 'high' ? '🟠' :
        item.impactLevel === 'medium' ? '🟡' :
          item.impactLevel === 'low' ? '🟢' : '⚪';

    const treeNode = treeLookup.get(item.funcId);
    let treeHtml = '';

    if (treeNode && treeNode.children.length > 0) {
      const treeContent = treeNode.children
        .map(child => renderTreeNode(child))
        .join('');
      treeHtml = `<div class="tree">${treeContent}</div>`;
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

  if (noDeps.length > 0) {
    const names = noDeps.map(i => `<code>${escapeHtml(i.name)}</code>`).join(', ');
    html += `<div class="no-deps">⚪ ${noDeps.length} node${noDeps.length > 1 ? 's' : ''} with no dependents: ${names}</div>`;
  }

  return html;
}

/**
 * Render the test targets table
 */
export function renderTestTargets(targets: TestTarget[]): string {
  if (targets.length === 0) {
    return '<p class="no-deps">No test targets found.</p>';
  }

  const rows = targets.map(t => {
    // Lower depth = closer to change = higher priority
    const priority = t.depth <= TEST_PRIORITY_THRESHOLDS.high ? '🔴 High' :
      t.depth <= TEST_PRIORITY_THRESHOLDS.medium ? '🟡 Medium' : '🟢 Low';
    const depthLabel = t.depth === 1 ? 'direct' : `${t.depth} levels`;
    const coversNames = t.covers.map(c => escapeHtml(c.split(':')[1] || c));
    const coversHtml = coversNames.map(n => `<code>${n}</code>`).join(' ');

    return `<tr>
      <td>${escapeHtml(t.name)}</td>
      <td>${escapeHtml(truncatePath(t.file))}:${t.line}</td>
      <td>${depthLabel}</td>
      <td>${coversHtml}</td>
      <td>${priority}</td>
    </tr>`;
  }).join('');

  return `<table class="entry-table">
    <thead>
      <tr>
        <th>Test Target</th>
        <th>File</th>
        <th>Depth</th>
        <th>Covers</th>
        <th>Priority</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="entry-count">${targets.length} test target${targets.length > 1 ? 's' : ''}</div>`;
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
  testTargetsHtml: string,
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
      <div class="section-title">Test Targets</div>
      ${testTargetsHtml}
    </div>
  </div>
  <script>${scripts}</script>
</body>
</html>`;
}
