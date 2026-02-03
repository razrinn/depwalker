// HTML format plugin for DepWalker

import type { AnalysisResult } from '../../types.js';
import type { FormatPlugin } from '../types.js';
import {
  truncatePath,
  buildImpactedItems,
  calculateStats,
  type ImpactedItem,
} from '../shared/utils.js';
import { buildTreeData, type TreeNode } from '../shared/tree-builder.js';

/**
 * HTML format plugin - generates interactive HTML reports
 */
export class HtmlFormatPlugin implements FormatPlugin {
  readonly name = 'html';
  readonly extension = 'html';
  readonly contentType = 'text/html';

  generate(result: AnalysisResult, maxDepth: number | null): string {
    const { changedFiles, changedFunctions, callGraph } = result;

    // Prepare data structures
    const impactedItems = buildImpactedItems(changedFunctions, callGraph);
    const treeData = impactedItems.map(item => buildTreeData(item.funcId, callGraph, maxDepth));
    const stats = calculateStats(changedFiles, impactedItems);

    // Get version from package or use default
    const VERSION = '0.3.9';

    return this.renderHtml(stats, impactedItems, treeData, VERSION);
  }

  private renderHtml(
    stats: ReturnType<typeof calculateStats>,
    impactedItems: ImpactedItem[],
    treeData: (TreeNode | null)[],
    version: string
  ): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Depwalker v${version} - Impact Analysis</title>
  ${this.renderStyles()}
</head>
<body>
  <div class="container">
    ${this.renderHeader(version)}
    ${this.renderStats(stats)}
    ${this.renderControls()}
    ${this.renderMainLayout(impactedItems)}
  </div>
  ${this.renderScripts(treeData, impactedItems)}
</body>
</html>`;
  }

  private renderStyles(): string {
    return `<style>
:root {
  --bg: #000000;
  --bg-elevated: #0a0a0a;
  --surface: #111111;
  --surface-hover: #1a1a1a;
  --surface-active: #222222;
  --border: #2a2a2a;
  --border-hover: #333333;
  --text: #e0e0e0;
  --text-secondary: #888888;
  --text-muted: #555555;
  --accent: #00ff41;
  --accent-dim: #00cc33;
  --accent-glow: rgba(0, 255, 65, 0.3);
  --critical: #ff2222;
  --high: #ff6622;
  --medium: #ffaa00;
  --low: #00ff41;
  --none: #666666;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Fira Code', monospace;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  min-height: 100vh;
  font-size: 13px;
}
.container { max-width: 1600px; margin: 0 auto; padding: 20px; }

/* Header - Compact */
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  margin-bottom: 12px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand-icon {
  width: 28px;
  height: 28px;
  background: var(--accent);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #000;
  font-weight: bold;
}
.brand-text h1 {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.3px;
  color: var(--text);
  line-height: 1.2;
}
.brand-text .version {
  font-size: 10px;
  color: var(--accent);
  font-weight: 500;
  line-height: 1.2;
}
.subtitle {
  color: var(--text-secondary);
  font-size: 11px;
  text-align: right;
}

/* Stats Grid - Compact */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
@media (max-width: 1400px) {
  .stats-grid { grid-template-columns: repeat(4, 1fr); }
}
@media (max-width: 900px) {
  .stats-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 600px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 10px 12px;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}
.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent);
  opacity: 0;
  transition: opacity 0.2s;
}
.stat-card:hover {
  border-color: var(--border-hover);
  background: var(--surface-hover);
}
.stat-card:hover::before { opacity: 1; }
.stat-value {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 1px;
  font-family: inherit;
}
.stat-label {
  font-size: 10px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}
.stat-critical { color: var(--critical); }
.stat-high { color: var(--high); }
.stat-medium { color: var(--medium); }
.stat-low { color: var(--low); }
.stat-none { color: var(--none); }
.stat-primary { color: var(--accent); }

/* Controls Bar - Compact */
.controls-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.search-box {
  flex: 1;
  min-width: 200px;
  position: relative;
}
.search-box::before {
  content: '⌕';
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 14px;
}
.search-box input {
  width: 100%;
  padding: 8px 12px 8px 30px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--text);
  font-size: 12px;
  font-family: inherit;
  transition: all 0.2s;
}
.search-box input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-glow);
}
.search-box input::placeholder {
  color: var(--text-muted);
}
.filter-group {
  display: flex;
  gap: 6px;
  background: var(--surface);
  padding: 4px;
  border-radius: 6px;
  border: 1px solid var(--border);
}
.filter-btn {
  padding: 7px 14px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.filter-btn:hover { 
  color: var(--text); 
  background: var(--surface-hover);
}
.filter-btn.active {
  background: var(--accent);
  color: #000;
  font-weight: 600;
}

/* Main Layout - Compact */
.main-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 12px;
  height: 800px;
}
@media (max-width: 900px) {
  .main-layout { 
    grid-template-columns: 1fr;
    height: auto;
    min-height: 600px;
  }
  .sidebar { max-height: 400px; }
}

/* Sidebar */
.sidebar {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.sidebar-header {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sidebar-header span {
  color: var(--accent);
}
.function-list {
  overflow-y: auto;
  flex: 1;
}
.function-list::-webkit-scrollbar {
  width: 6px;
}
.function-list::-webkit-scrollbar-track {
  background: var(--bg);
}
.function-list::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}
.function-item {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 8px;
}
.function-item:hover { 
  background: var(--surface-hover); 
}
.function-item.active { 
  background: var(--surface-active);
  border-left: 3px solid var(--accent);
  padding-left: 7px;
}
.impact-indicator {
  width: 3px;
  height: 24px;
  border-radius: 2px;
  flex-shrink: 0;
}
.impact-indicator.critical { background: var(--critical); }
.impact-indicator.high { background: var(--high); }
.impact-indicator.medium { background: var(--medium); }
.impact-indicator.low { background: var(--low); }
.impact-indicator.none { background: var(--none); }
.function-info { flex: 1; min-width: 0; }
.function-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text);
  margin-bottom: 2px;
}
.function-meta {
  font-size: 11px;
  color: var(--text-muted);
  font-family: inherit;
}
.function-count {
  font-size: 12px;
  color: var(--accent);
  font-weight: 600;
  background: rgba(0, 255, 65, 0.1);
  padding: 3px 8px;
  border-radius: 4px;
  min-width: 28px;
  text-align: center;
}

/* Content Area */
.content {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.content-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-elevated);
}
.content-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.content-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}
.content-subtitle { 
  font-size: 12px; 
  color: var(--text-muted); 
}
.impact-badge {
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 1px solid transparent;
}
.impact-badge.critical { 
  background: rgba(255, 34, 34, 0.2); 
  color: var(--critical); 
  border-color: rgba(255, 34, 34, 0.4);
}
.impact-badge.high { 
  background: rgba(255, 102, 34, 0.15); 
  color: var(--high); 
  border-color: rgba(255, 102, 34, 0.3);
}
.impact-badge.medium { 
  background: rgba(255, 170, 0, 0.15); 
  color: var(--medium); 
  border-color: rgba(255, 170, 0, 0.3);
}
.impact-badge.low { 
  background: rgba(0, 255, 65, 0.1); 
  color: var(--low); 
  border-color: rgba(0, 255, 65, 0.2);
}
.impact-badge.none { 
  background: rgba(102, 102, 102, 0.15); 
  color: var(--none); 
  border-color: rgba(102, 102, 102, 0.3);
}

/* Tabs */
.tabs {
  display: flex;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
  padding: 0;
}
.tab {
  padding: 12px 20px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.2s;
  background: transparent;
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}
.tab:hover { 
  color: var(--text); 
  background: var(--surface-hover);
}
.tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  background: var(--surface);
}
.tab-content { 
  display: none; 
  flex: 1;
  overflow: auto;
}
.tab-content.active { display: block; }

/* Tree View */
.tree-view { padding: 20px; }
.tree-node {
  position: relative;
  padding-left: 20px;
}
.tree-node::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--border);
}
.tree-node:last-child::before { 
  bottom: auto; 
  height: 20px; 
}
.tree-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  margin-left: -20px;
  padding-left: 20px;
}
.tree-content:hover { 
  background: var(--surface-hover); 
}
.tree-toggle {
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 9px;
  flex-shrink: 0;
  transition: transform 0.2s;
}
.tree-toggle.collapsed::before { content: '▶'; }
.tree-toggle.expanded::before { content: '▼'; }
.tree-toggle.leaf::before { content: '•'; color: var(--accent); font-size: 8px; }
.tree-label {
  font-size: 13px;
  color: var(--text);
}
.tree-label.root {
  color: var(--accent);
  font-weight: 500;
}
.tree-location {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: auto;
  font-family: inherit;
}
.tree-children { margin-top: 2px; }
.tree-children.collapsed { display: none; }

/* Graph Container */
.graph-container {
  width: 100%;
  height: 100%;
  position: relative;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}
.graph-container * {
  user-select: none;
  -webkit-user-select: none;
}
.graph-container:active,
.graph-container.dragging {
  cursor: grabbing;
}
.graph-svg { 
  width: 100%;
  height: 100%;
  background: var(--bg);
}
.graph-node {
  cursor: pointer;
}
.graph-node rect {
  stroke-width: 1;
  rx: 4;
}
.graph-node:hover rect {
  stroke-width: 2;
  filter: drop-shadow(0 0 4px var(--accent-glow));
}
.graph-node text {
  fill: var(--text);
  font-size: 11px;
  font-family: inherit;
  pointer-events: none;
  dominant-baseline: middle;
}
.graph-node .node-file {
  fill: var(--text-muted);
  font-size: 9px;
}
.graph-link {
  fill: none;
  stroke: var(--border);
  stroke-width: 1.5;
  transition: stroke 0.2s, stroke-width 0.2s, opacity 0.2s;
}
.graph-link.highlighted {
  stroke: var(--accent);
  stroke-width: 2;
  stroke-dasharray: 5,3;
}
.graph-link.active {
  stroke: var(--accent);
  stroke-width: 2.5;
  opacity: 1;
}
.graph-link.dimmed {
  opacity: 0.15;
}
.graph-node {
  cursor: pointer;
  transition: opacity 0.2s;
}
.graph-node.selected rect {
  stroke: var(--accent);
  stroke-width: 2;
  filter: drop-shadow(0 0 8px var(--accent-glow));
}
.graph-node.connected rect {
  stroke: var(--accent-dim);
  stroke-width: 1.5;
}
.graph-node.dimmed {
  opacity: 0.3;
}
.graph-node-root rect {
  stroke-width: 2;
  filter: drop-shadow(0 0 6px var(--accent-glow));
}

/* Header Controls */
.header-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.header-btn {
  width: 28px;
  height: 28px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  font-family: inherit;
  padding: 0;
}
.header-btn:hover {
  background: var(--surface-hover);
  border-color: var(--accent);
  color: var(--accent);
}
.zoom-level {
  font-size: 11px;
  color: var(--text-secondary);
  min-width: 36px;
  text-align: center;
  font-weight: 500;
}

/* Layer Panel */
.graph-layout {
  display: flex;
  flex: 1;
  min-height: 0;
}
.layer-panel {
  width: 70px;
  background: var(--bg-elevated);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 12px 8px;
  gap: 8px;
}
.layer-panel-title {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
.layer-panel-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}
.layer-panel-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}
.layer-btn {
  padding: 6px 4px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  font-weight: 500;
  text-align: center;
}
.layer-btn:hover {
  border-color: var(--border-hover);
  color: var(--text);
  background: var(--surface-hover);
}
.layer-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #000;
}
.layer-btn.toggle-all-btn {
  background: var(--surface-hover);
  border-color: var(--border-hover);
  font-size: 10px;
  padding: 8px 4px;
}
.layer-btn.toggle-all-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: #000;
}
.graph-view {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--bg);
  min-height: 1400px;
}
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}
.empty-state-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--accent);
}
.empty-state p {
  font-size: 13px;
  color: var(--text-muted);
}
</style>`;
  }

  private renderHeader(version: string): string {
    return `<header>
  <div class="brand">
    <div class="brand-icon">◈</div>
    <div class="brand-text">
      <h1>Depwalker</h1>
      <div class="version">v${version}</div>
    </div>
  </div>
  <div class="subtitle">Dependency Impact Analysis Report</div>
</header>`;
  }

  private renderStats(stats: ReturnType<typeof calculateStats>): string {
    return `<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value stat-primary">${stats.changedFiles}</div>
    <div class="stat-label">Changed Files</div>
  </div>
  <div class="stat-card">
    <div class="stat-value stat-primary">${stats.changedFunctions}</div>
    <div class="stat-label">Changed Functions</div>
  </div>
  <div class="stat-card">
    <div class="stat-value stat-critical">${stats.critical}</div>
    <div class="stat-label">Critical Impact</div>
  </div>
  <div class="stat-card">
    <div class="stat-value stat-high">${stats.high}</div>
    <div class="stat-label">High Impact</div>
  </div>
  <div class="stat-card">
    <div class="stat-value stat-medium">${stats.medium}</div>
    <div class="stat-label">Medium Impact</div>
  </div>
  <div class="stat-card">
    <div class="stat-value stat-low">${stats.low}</div>
    <div class="stat-label">Low Impact</div>
  </div>
  <div class="stat-card">
    <div class="stat-value stat-none">${stats.none}</div>
    <div class="stat-label">No Impact</div>
  </div>
</div>`;
  }

  private renderControls(): string {
    return `<div class="controls-bar">
  <div class="search-box">
    <input type="text" id="searchInput" placeholder="Search functions...">
  </div>
  <div class="filter-group">
    <button class="filter-btn active" data-filter="all">All</button>
    <button class="filter-btn" data-filter="critical">Critical</button>
    <button class="filter-btn" data-filter="high">High</button>
    <button class="filter-btn" data-filter="medium">Medium</button>
    <button class="filter-btn" data-filter="low">Low</button>
  </div>
</div>`;
  }

  private renderMainLayout(impactedItems: ImpactedItem[]): string {
    const functionItems = impactedItems.map(item => `
      <div class="function-item" data-func-id="${this.escapeHtml(item.funcId)}" data-impact="${item.impactLevel}">
        <div class="impact-indicator ${item.impactLevel}"></div>
        <div class="function-info">
          <div class="function-name">${this.escapeHtml(item.name)}</div>
          <div class="function-meta">${truncatePath(item.file)}:${item.line}</div>
        </div>
        <span class="function-count">${item.dependents}</span>
      </div>`).join('');

    return `<div class="main-layout">
  <aside class="sidebar">
    <div class="sidebar-header">Changed Functions <span>${impactedItems.length}</span></div>
    <div class="function-list" id="functionList">
      ${functionItems}
    </div>
  </aside>

  <main class="content">
    <div class="tabs">
      <button class="tab active" data-tab="tree">Tree View</button>
      <button class="tab" data-tab="graph">Graph View</button>
    </div>
    
    <div class="tab-content active" id="treeTab">
      <div id="treeContainer">
        <div class="empty-state">
          <div class="empty-state-icon">◈</div>
          <p>Select a function to view its impact tree</p>
        </div>
      </div>
    </div>
    
    <div class="tab-content" id="graphTab">
      <div id="graphContainer">
        <div class="empty-state">
          <div class="empty-state-icon">◈</div>
          <p>Select a function to view dependency graph</p>
        </div>
      </div>
    </div>
  </main>
</div>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private renderScripts(
    treeData: (TreeNode | null)[],
    impactedItems: ImpactedItem[]
  ): string {
    return `<script>
const treeData = ${JSON.stringify(treeData)};
const functionData = ${JSON.stringify(impactedItems)};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderTree(node, level) {
  if (!node) return '';
  level = level || 0;
  
  const hasChildren = node.children && node.children.length > 0;
  const toggleClass = hasChildren ? 'expanded' : 'leaf';
  const location = level === 0 
    ? node.file + ':' + node.line 
    : node.file.split('/').pop() + ':' + node.line;
  
  let html = '<div class="tree-node">';
  html += '<div class="tree-content" style="padding-left: ' + (level * 16) + 'px">' +
    '<span class="tree-toggle ' + toggleClass + '" onclick="toggleNode(this)"></span>' +
    '<span class="tree-label ' + (level === 0 ? 'root' : '') + '">' + escapeHtml(node.name) + '</span>' +
    '<span class="tree-location">' + escapeHtml(location) + '</span>' +
  '</div>';
  
  if (hasChildren) {
    html += '<div class="tree-children">';
    for (const child of node.children) {
      html += renderTree(child, level + 1);
    }
    html += '</div>';
  }
  
  html += '</div>';
  return html;
}

function toggleNode(el) {
  if (el.classList.contains('leaf')) return;
  el.classList.toggle('collapsed');
  el.classList.toggle('expanded');
  const children = el.closest('.tree-node').querySelector('.tree-children');
  if (children) children.classList.toggle('collapsed');
}

// Graph rendering with zoom/pan
let graphState = {
  scale: 1,
  translateX: 0,
  translateY: 0,
  isDragging: false,
  lastX: 0,
  lastY: 0,
  minScale: 0.05,
  maxScale: 50,
  visibleLayers: new Set()
};

function getMaxDepth(node, visited) {
  if (!node) return 0;
  if (visited.has(node.id)) return 0;
  visited.add(node.id);
  
  if (!node.children || node.children.length === 0) return 0;
  
  let maxChildDepth = 0;
  for (const child of node.children) {
    maxChildDepth = Math.max(maxChildDepth, getMaxDepth(child, new Set(visited)));
  }
  return maxChildDepth + 1;
}

window.toggleLayer = function(depth) {
  if (graphState.visibleLayers.has(depth)) {
    graphState.visibleLayers.delete(depth);
  } else {
    graphState.visibleLayers.add(depth);
  }
  updateLayerButtons();
  updateGraphVisibility();
};

window.toggleAllLayers = function() {
  const maxDepth = parseInt(document.querySelector('.layer-btn[data-layer]:last-child')?.dataset.layer || '0');
  const allVisible = graphState.visibleLayers.size > 1;
  
  if (allVisible) {
    graphState.visibleLayers.clear();
    graphState.visibleLayers.add(0);
  } else {
    for (let i = 0; i <= maxDepth; i++) {
      graphState.visibleLayers.add(i);
    }
  }
  updateLayerButtons();
  updateAllToggleButton();
  updateGraphVisibility();
};

function updateAllToggleButton() {
  const btn = document.getElementById('toggleAllBtn');
  if (btn) {
    const allVisible = graphState.visibleLayers.size > 1;
    btn.textContent = allVisible ? 'Hide All' : 'Show All';
  }
}

function updateLayerButtons() {
  document.querySelectorAll('.layer-btn').forEach(btn => {
    const layer = parseInt(btn.dataset.layer);
    if (graphState.visibleLayers.has(layer)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function updateGraphVisibility() {
  const svg = document.getElementById('graphSvg');
  if (!svg) return;
  
  svg.querySelectorAll('.graph-node').forEach(node => {
    const depth = parseInt(node.dataset.depth);
    if (graphState.visibleLayers.has(depth)) {
      node.style.display = '';
      node.style.opacity = '1';
    } else {
      node.style.display = 'none';
    }
  });
  
  svg.querySelectorAll('.graph-link').forEach(link => {
    const sourceId = link.dataset.source;
    const targetId = link.dataset.target;
    const sourceNode = svg.querySelector('.graph-node[data-node-id="' + sourceId + '"]');
    const targetNode = svg.querySelector('.graph-node[data-node-id="' + targetId + '"]');
    
    if (sourceNode && targetNode) {
      const sourceDepth = parseInt(sourceNode.dataset.depth);
      const targetDepth = parseInt(targetNode.dataset.depth);
      
      if (graphState.visibleLayers.has(sourceDepth) && graphState.visibleLayers.has(targetDepth)) {
        link.style.display = '';
        link.style.opacity = '1';
      } else {
        link.style.display = 'none';
      }
    }
  });
  
  if (selectedNodeId) {
    highlightNodeConnections(selectedNodeId);
  }
}

function countLeaves(node, visited) {
  if (!node) return 0;
  if (visited.has(node.id)) return 0;
  visited.add(node.id);
  
  if (!node.children || node.children.length === 0) {
    return 1;
  }
  
  let leaves = 0;
  for (const child of node.children) {
    leaves += countLeaves(child, new Set(visited));
  }
  return Math.max(leaves, 1);
}

function buildRadialLayout(rootNode) {
  if (!rootNode) return { nodes: [], links: [] };
  
  const nodes = [];
  const links = [];
  const nodeMap = new Map();
  const visited = new Set();
  
  const leafCounts = new Map();
  
  function calcLeafCounts(node) {
    if (!node || leafCounts.has(node.id)) return leafCounts.get(node.id) || 0;
    
    let count = 0;
    const hasChildren = node.children && node.children.length > 0;
    
    if (!hasChildren) {
      count = 1;
    } else {
      for (const child of node.children) {
        count += calcLeafCounts(child);
      }
    }
    
    leafCounts.set(node.id, Math.max(count, 1));
    return Math.max(count, 1);
  }
  
  calcLeafCounts(rootNode);
  
  const rootLeaves = leafCounts.get(rootNode.id) || 1;
  
  function assignPositions(node, depth, startAngle, endAngle, parentId) {
    if (!node) return;
    if (visited.has(node.id)) {
      if (parentId) {
        links.push({ source: parentId, target: node.id, circular: true });
      }
      return;
    }
    visited.add(node.id);
    
    const levelSpacing = 140;
    const radius = depth === 0 ? 0 : 60 + depth * levelSpacing;
    
    const midAngle = (startAngle + endAngle) / 2;
    
    const x = Math.cos(midAngle) * radius;
    const y = Math.sin(midAngle) * radius;
    
    const n = {
      id: node.id,
      name: node.name,
      file: node.file.split('/').pop(),
      depth: depth,
      isRoot: depth === 0,
      x: x,
      y: y,
      targetX: x,
      targetY: y,
      angle: midAngle,
      radius: radius,
      sectorStart: startAngle,
      sectorEnd: endAngle,
      parentId: parentId
    };
    nodes.push(n);
    nodeMap.set(node.id, n);
    
    if (parentId) {
      links.push({ source: parentId, target: node.id, circular: false });
    }
    
    if (node.children && node.children.length > 0) {
      const totalLeaves = leafCounts.get(node.id) || 1;
      const sectorSize = endAngle - startAngle;
      let currentAngle = startAngle;
      
      const sortedChildren = [...node.children].sort((a, b) => {
        return (leafCounts.get(b.id) || 1) - (leafCounts.get(a.id) || 1);
      });
      
      for (const child of sortedChildren) {
        const childLeaves = leafCounts.get(child.id) || 1;
        const childSectorSize = (childLeaves / totalLeaves) * sectorSize;
        
        assignPositions(child, depth + 1, currentAngle, currentAngle + childSectorSize, node.id);
        currentAngle += childSectorSize;
      }
    }
  }
  
  assignPositions(rootNode, 0, 0, 2 * Math.PI, null);
  
  return { nodes, links, nodeMap };
}

function renderGraph(rootNode) {
  if (!rootNode) return '';
  
  const nodeWidth = 160;
  const nodeHeight = 50;
  
  const { nodes, links, nodeMap } = buildRadialLayout(rootNode);
  
  if (nodes.length === 0) return '';
  
  const maxNodeDepth = Math.max(...nodes.map(n => n.depth));
  graphState.visibleLayers.clear();
  for (let i = 0; i <= maxNodeDepth; i++) {
    graphState.visibleLayers.add(i);
  }
  
  const minDistX = nodeWidth + 20;
  const minDistY = nodeHeight + 20;
  
  for (let iteration = 0; iteration < 200; iteration++) {
    let moved = false;
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        const overlapX = minDistX - absDx;
        const overlapY = minDistY - absDy;
        
        if (overlapX > 0 && overlapY > 0) {
          moved = true;
          
          const aAngle = Math.atan2(a.y, a.x);
          const bAngle = Math.atan2(b.y, b.x);
          const angleDiff = Math.abs(aAngle - bAngle);
          
          const similarAngle = angleDiff < 0.3 || angleDiff > Math.PI * 2 - 0.3;
          
          let pushX, pushY;
          const pushAmount = 3 * (1 - iteration / 250);
          
          if (similarAngle) {
            const aDist = Math.sqrt(a.x * a.x + a.y * a.y) || 1;
            const bDist = Math.sqrt(b.x * b.x + b.y * b.y) || 1;
            
            if (a.depth !== b.depth) {
              const outer = a.depth > b.depth ? a : b;
              const dist = Math.sqrt(outer.x * outer.x + outer.y * outer.y) || 1;
              pushX = (outer.x / dist) * pushAmount;
              pushY = (outer.y / dist) * pushAmount;
              outer.x += pushX;
              outer.y += pushY;
            } else {
              const tangentialX = -Math.sin(aAngle);
              const tangentialY = Math.cos(aAngle);
              pushX = tangentialX * pushAmount * 0.5;
              pushY = tangentialY * pushAmount * 0.5;
              
              a.x -= pushX;
              a.y -= pushY;
              b.x += pushX;
              b.y += pushY;
            }
          } else {
            if (overlapX < overlapY) {
              pushX = (overlapX / 2 + 2) * (dx > 0 ? -1 : 1) * 0.5;
              a.x += pushX;
              b.x -= pushX;
            } else {
              pushY = (overlapY / 2 + 2) * (dy > 0 ? -1 : 1) * 0.5;
              a.y += pushY;
              b.y -= pushY;
            }
          }
        }
      }
    }
    
    const pullStrength = 0.05 * (1 - iteration / 300);
    nodes.forEach(n => {
      if (n.isRoot) return;
      n.x += (n.targetX - n.x) * pullStrength;
      n.y += (n.targetY - n.y) * pullStrength;
    });
    
    if (!moved && iteration > 50) break;
  }
  
  const minX = Math.min(...nodes.map(n => n.x)) - nodeWidth;
  const maxX = Math.max(...nodes.map(n => n.x)) + nodeWidth;
  const minY = Math.min(...nodes.map(n => n.y)) - nodeHeight;
  const maxY = Math.max(...nodes.map(n => n.y)) + nodeHeight;
  
  let boundsWidth = maxX - minX;
  let boundsHeight = maxY - minY;
  
  const maxBounds = 8000;
  if (boundsWidth > maxBounds || boundsHeight > maxBounds || !isFinite(boundsWidth) || !isFinite(boundsHeight)) {
    boundsWidth = Math.min(boundsWidth, maxBounds);
    boundsHeight = Math.min(boundsHeight, maxBounds);
  }
  
  graphState.scale = 1;
  graphState.translateX = 0;
  graphState.translateY = 0;
  
  let svg = '<div class="graph-container" id="graphContainerInner">' +
    '<svg class="graph-svg" id="graphSvg" viewBox="' + minX + ' ' + minY + ' ' + boundsWidth + ' ' + boundsHeight + '">' +
    '<defs>' +
      '<marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">' +
        '<polygon points="0 0, 8 3, 0 6" fill="var(--border)" />' +
      '</marker>' +
      '<marker id="arrowhead-highlight" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">' +
        '<polygon points="0 0, 8 3, 0 6" fill="var(--accent)" />' +
      '</marker>' +
    '</defs>' +
    '<g id="graphTransformGroup">'
  
  const linkIds = new Map();
  
  links.forEach((link, idx) => {
    const source = nodeMap.get(link.source);
    const target = nodeMap.get(link.target);
    if (source && target) {
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      
      const angle = Math.atan2(dy, dx);
      const startX = source.x + Math.cos(angle) * (nodeWidth / 2);
      const startY = source.y + Math.sin(angle) * (nodeHeight / 2);
      const endX = target.x - Math.cos(angle) * (nodeWidth / 2);
      const endY = target.y - Math.sin(angle) * (nodeHeight / 2);
      
      const linkId = 'link-' + link.source + '-' + link.target;
      linkIds.set(link.source + '-' + link.target, linkId);
      linkIds.set(link.target + '-' + link.source, linkId);
      
      svg += '<line id="' + linkId + '" class="graph-link' + (link.circular ? ' highlighted' : '') + '" ' +
        'data-source="' + link.source + '" data-target="' + link.target + '" ' +
        'x1="' + startX + '" y1="' + startY + '" x2="' + endX + '" y2="' + endY + '"' +
        (link.circular ? '' : ' marker-end="url(#arrowhead)"') + '/>';
    }
  });
  
  nodes.forEach(n => {
    const color = n.isRoot ? 'var(--accent)' : 
      n.depth === 1 ? 'var(--high)' : 
      n.depth === 2 ? 'var(--medium)' : 'var(--low)';
    
    const displayName = n.name.length > 16 ? n.name.substring(0, 16) + '..' : n.name;
    
    svg += '<g class="graph-node' + (n.isRoot ? ' graph-node-root' : '') + '" ' +
      'transform="translate(' + (n.x - nodeWidth/2) + ',' + (n.y - nodeHeight/2) + ')"' +
      ' data-node-id="' + n.id.replace(/"/g, '&quot;') + '"' +
      ' data-depth="' + n.depth + '">' +
      '<rect width="' + nodeWidth + '" height="' + nodeHeight + '" fill="var(--surface)" stroke="' + color + '"/>' +
      '<text x="' + (nodeWidth/2) + '" y="' + (nodeHeight/2 - 6) + '" text-anchor="middle" font-weight="500" font-size="10px">' + 
        escapeHtml(displayName) + '</text>' +
      '<text class="node-file" x="' + (nodeWidth/2) + '" y="' + (nodeHeight/2 + 10) + '" text-anchor="middle">' + 
        escapeHtml(n.file) + '</text>' +
    '</g>';
  });
  
  svg += '</g></svg>' +
  '</div>';
  
  return svg;
}

function updateTransform() {
  graphState.scale = Math.max(graphState.minScale, Math.min(graphState.maxScale, graphState.scale));
  
  const group = document.getElementById('graphTransformGroup');
  if (group) {
    group.setAttribute('transform', 'translate(' + graphState.translateX + ',' + graphState.translateY + ') scale(' + graphState.scale + ')');
  }
  const headerZoomDisplay = document.getElementById('headerZoomLevel');
  if (headerZoomDisplay) {
    headerZoomDisplay.textContent = Math.round(graphState.scale * 100) + '%';
  }
}

window.zoomIn = function() {
  graphState.scale = Math.min(graphState.maxScale, graphState.scale * 1.5);
  updateTransform();
};

window.zoomOut = function() {
  graphState.scale = Math.max(graphState.minScale, graphState.scale / 1.5);
  updateTransform();
};

window.resetZoom = function() {
  graphState.scale = 1;
  graphState.translateX = 0;
  graphState.translateY = 0;
  updateTransform();
};

let selectedNodeId = null;

window.highlightNodeConnections = function(nodeId) {
  selectedNodeId = nodeId;
  const svg = document.getElementById('graphSvg');
  if (!svg) return;
  
  const connectedLinks = [];
  const connectedNodes = new Set([nodeId]);
  
  svg.querySelectorAll('.graph-link').forEach(link => {
    const source = link.getAttribute('data-source');
    const target = link.getAttribute('data-target');
    if (source === nodeId || target === nodeId) {
      connectedLinks.push(link);
      connectedNodes.add(source);
      connectedNodes.add(target);
    }
  });
  
  svg.querySelectorAll('.graph-link').forEach(link => {
    link.classList.remove('active', 'dimmed');
    link.setAttribute('marker-end', 'url(#arrowhead)');
    if (connectedLinks.includes(link)) {
      link.classList.add('active');
      link.setAttribute('marker-end', 'url(#arrowhead-highlight)');
    } else {
      link.classList.add('dimmed');
    }
  });
  
  svg.querySelectorAll('.graph-node').forEach(node => {
    const id = node.getAttribute('data-node-id');
    node.classList.remove('selected', 'connected', 'dimmed');
    if (id === nodeId) {
      node.classList.add('selected');
    } else if (connectedNodes.has(id)) {
      node.classList.add('connected');
    } else {
      node.classList.add('dimmed');
    }
  });
};

window.clearHighlight = function() {
  selectedNodeId = null;
  const svg = document.getElementById('graphSvg');
  if (!svg) return;
  
  svg.querySelectorAll('.graph-link').forEach(link => {
    link.classList.remove('active', 'dimmed');
    link.setAttribute('marker-end', 'url(#arrowhead)');
  });
  svg.querySelectorAll('.graph-node').forEach(node => {
    node.classList.remove('selected', 'connected', 'dimmed');
  });
};

window.fitToScreen = function() {
  const svg = document.getElementById('graphSvg');
  const container = document.getElementById('graphContainerInner');
  if (!svg || !container) return;
  
  const viewBox = svg.getAttribute('viewBox');
  if (!viewBox) return;
  
  const vbParts = viewBox.split(' ').map(parseFloat);
  const vbX = vbParts[0];
  const vbY = vbParts[1];
  const vbWidth = vbParts[2] || 1;
  const vbHeight = vbParts[3] || 1;
  
  const containerRect = container.getBoundingClientRect();
  if (!containerRect.width || !containerRect.height) return;
  
  const padding = 20;
  const availableWidth = Math.max(1, containerRect.width - padding * 2);
  const availableHeight = Math.max(1, containerRect.height - padding * 2);
  
  const scaleX = availableWidth / vbWidth;
  const scaleY = availableHeight / vbHeight;
  
  let newScale = Math.min(scaleX, scaleY);
  newScale = Math.max(graphState.minScale, Math.min(graphState.maxScale, newScale));
  
  if (!isFinite(newScale) || newScale <= 0) {
    newScale = 1;
  }
  
  graphState.scale = newScale;
  
  graphState.translateX = (containerRect.width - vbWidth * graphState.scale) / 2 - vbX * graphState.scale;
  graphState.translateY = (containerRect.height - vbHeight * graphState.scale) / 2 - vbY * graphState.scale;
  
  updateTransform();
};

function setupGraphInteractions() {
  const container = document.getElementById('graphContainerInner');
  const svg = document.getElementById('graphSvg');
  if (!container || !svg) return;
  
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  
  // Smooth pan/zoom state
  let smoothState = {
    targetX: graphState.translateX,
    targetY: graphState.translateY,
    targetScale: graphState.scale,
    currentX: graphState.translateX,
    currentY: graphState.translateY,
    currentScale: graphState.scale,
    isAnimating: false,
    lastPanTime: 0
  };
  
  function lerp(start, end, t) {
    return start + (end - start) * t;
  }
  
  function updateSmoothTransform() {
    const lerpFactor = 0.15;
    const epsilon = 0.01;
    
    smoothState.currentX = lerp(smoothState.currentX, smoothState.targetX, lerpFactor);
    smoothState.currentY = lerp(smoothState.currentY, smoothState.targetY, lerpFactor);
    smoothState.currentScale = lerp(smoothState.currentScale, smoothState.targetScale, lerpFactor);
    
    const dx = Math.abs(smoothState.currentX - smoothState.targetX);
    const dy = Math.abs(smoothState.currentY - smoothState.targetY);
    const dScale = Math.abs(smoothState.currentScale - smoothState.targetScale);
    
    graphState.translateX = smoothState.currentX;
    graphState.translateY = smoothState.currentY;
    graphState.scale = smoothState.currentScale;
    updateTransform();
    
    if (dx > epsilon || dy > epsilon || dScale > 0.001) {
      smoothState.isAnimating = true;
      requestAnimationFrame(updateSmoothTransform);
    } else {
      smoothState.isAnimating = false;
    }
  }
  
  function startAnimation() {
    if (!smoothState.isAnimating) {
      smoothState.isAnimating = true;
      requestAnimationFrame(updateSmoothTransform);
    }
  }
  
  container.addEventListener('click', function(e) {
    if (isDragging) return;
    
    if (e.target.tagName === 'BUTTON') {
      return;
    }
    
    const nodeGroup = e.target.closest('.graph-node');
    if (nodeGroup) {
      const nodeId = nodeGroup.getAttribute('data-node-id');
      if (nodeId) {
        highlightNodeConnections(nodeId);
        return;
      }
    }
    
    if (e.target.id === 'graphSvg' || e.target.id === 'graphContainerInner') {
      clearHighlight();
    }
  });
  
  // Wheel handler with smooth pan/zoom
  container.addEventListener('wheel', function(e) {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Detect trackpad by checking deltaMode and typical trackpad patterns
    const isTrackpad = e.deltaMode === 0 && Math.abs(e.deltaY) < 50 && Math.abs(e.deltaX) < 50;
    
    if (e.ctrlKey || e.metaKey || (!isTrackpad && Math.abs(e.deltaY) > Math.abs(e.deltaX))) {
      // Zoom behavior (Ctrl/Cmd + wheel, or mouse wheel without significant horizontal delta)
      const zoomSensitivity = isTrackpad ? 0.008 : 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.max(graphState.minScale, Math.min(graphState.maxScale, smoothState.targetScale * (1 + delta)));
      
      // Zoom towards mouse position
      const worldX = (mouseX - smoothState.targetX) / smoothState.targetScale;
      const worldY = (mouseY - smoothState.targetY) / smoothState.targetScale;
      
      smoothState.targetX = mouseX - worldX * newScale;
      smoothState.targetY = mouseY - worldY * newScale;
      smoothState.targetScale = newScale;
    } else {
      // Pan behavior (two-finger scroll on trackpad, or Shift + wheel)
      const panSensitivity = isTrackpad ? 1.2 : 1.5;
      const multiplier = smoothState.targetScale > 1 ? 1 : Math.max(0.5, smoothState.targetScale);
      
      smoothState.targetX -= e.deltaX * panSensitivity * multiplier;
      smoothState.targetY -= e.deltaY * panSensitivity * multiplier;
    }
    
    smoothState.currentX = smoothState.targetX;
    smoothState.currentY = smoothState.targetY;
    smoothState.currentScale = smoothState.targetScale;
    
    // Sync back to graphState for other operations
    graphState.translateX = smoothState.targetX;
    graphState.translateY = smoothState.targetY;
    graphState.scale = smoothState.targetScale;
    updateTransform();
  }, { passive: false });
  
  container.addEventListener('mousedown', function(e) {
    if (e.target.tagName === 'BUTTON') return;
    isDragging = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    graphState.isDragging = true;
    graphState.lastX = e.clientX;
    graphState.lastY = e.clientY;
    smoothState.lastPanTime = Date.now();
    container.classList.add('dragging');
  });
  
  window.addEventListener('mousemove', function(e) {
    if (!graphState.isDragging) return;
    const moveX = Math.abs(e.clientX - dragStartX);
    const moveY = Math.abs(e.clientY - dragStartY);
    if (moveX > 3 || moveY > 3) {
      isDragging = true;
    }
    
    const dx = e.clientX - graphState.lastX;
    const dy = e.clientY - graphState.lastY;
    
    smoothState.targetX += dx;
    smoothState.targetY += dy;
    smoothState.currentX = smoothState.targetX;
    smoothState.currentY = smoothState.targetY;
    
    graphState.translateX = smoothState.targetX;
    graphState.translateY = smoothState.targetY;
    graphState.lastX = e.clientX;
    graphState.lastY = e.clientY;
    smoothState.lastPanTime = Date.now();
    
    updateTransform();
  });
  
  window.addEventListener('mouseup', function() {
    graphState.isDragging = false;
    if (container) container.classList.remove('dragging');
  });
  
  // Sync smoothState when external functions modify graphState
  const originalUpdateTransform = updateTransform;
  window.updateTransform = function() {
    smoothState.targetX = graphState.translateX;
    smoothState.targetY = graphState.translateY;
    smoothState.targetScale = graphState.scale;
    smoothState.currentX = graphState.translateX;
    smoothState.currentY = graphState.translateY;
    smoothState.currentScale = graphState.scale;
    originalUpdateTransform();
  };
}

function showFunctionDetail(funcId) {
  const func = functionData.find(function(f) { return f.funcId === funcId; });
  if (!func) return;

  const treeNode = treeData.find(function(t) { return t && t.id === funcId; });
  
  let treeHeaderHtml = '<div class="content-header">' +
    '<div class="content-title-group">' +
      '<div class="content-title">' + escapeHtml(func.name) + '</div>' +
      '<div class="content-subtitle">' + escapeHtml(func.file) + ':' + func.line + ' · Score: ' + func.score + ' (' + func.dependents + ' deps, depth ' + func.depth + ')</div>' +
    '</div>' +
    '<span class="impact-badge ' + func.impactLevel + '">' + func.impactLevel + '</span>' +
  '</div>';
  
  const maxDepth = treeNode ? getMaxDepth(treeNode, new Set()) : 0;
  
  let layerButtonsHtml = '';
  for (let i = 0; i <= maxDepth; i++) {
    const label = i === 0 ? 'Root' : 'L' + i;
    layerButtonsHtml += '<button class="layer-btn active" data-layer="' + i + '" onclick="toggleLayer(' + i + ')">' + label + '</button>';
  }
  
  let graphHeaderHtml = '<div class="content-header">' +
    '<div class="content-title-group">' +
      '<div class="content-title">' + escapeHtml(func.name) + '</div>' +
      '<div class="content-subtitle">' + escapeHtml(func.file) + ':' + func.line + ' · Score: ' + func.score + ' (' + func.dependents + ' deps, depth ' + func.depth + ')</div>' +
    '</div>' +
    '<div class="header-controls">' +
      '<div class="zoom-controls">' +
        '<button class="header-btn" onclick="zoomOut()" title="Zoom out">−</button>' +
        '<span class="zoom-level" id="headerZoomLevel">100%</span>' +
        '<button class="header-btn" onclick="zoomIn()" title="Zoom in">+</button>' +
        '<button class="header-btn" onclick="fitToScreen()" title="Fit to screen">⟲</button>' +
        '<button class="header-btn" onclick="resetZoom()" title="Reset">⌂</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  
  // Lazy imports section
  let lazyImportsHtml = '';
  if (func.lazyImports && func.lazyImports.length > 0) {
    lazyImportsHtml += '<div style="padding: 12px 20px; border-bottom: 1px solid var(--border); background: var(--bg-elevated);">';
    lazyImportsHtml += '<p style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Lazy Imports</p>';
    lazyImportsHtml += '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';
    for (const li of func.lazyImports) {
      lazyImportsHtml += '<span style="padding: 4px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; font-size: 12px; color: var(--text); font-family: inherit;">📦 ' + escapeHtml(li.moduleSpecifier) + ' <span style="color: var(--text-muted);">(L' + li.line + ')</span></span>';
    }
    lazyImportsHtml += '</div></div>';
  }
  
  let treeHtml = '<div class="tree-view">';
  if (treeNode && treeNode.children && treeNode.children.length > 0) {
    treeHtml += '<p style="margin-bottom: 16px; color: var(--text-muted); font-size: 12px;">Functions that depend on this change:</p>';
    treeHtml += renderTree(treeNode, 0);
  } else {
    treeHtml += '<div class="empty-state">' +
      '<div class="empty-state-icon">✓</div>' +
      '<p>No dependencies found — safe to modify</p>' +
    '</div>';
  }
  treeHtml += '</div>';
  
  let layerPanelHtml = '<div class="layer-panel">' +
    '<div class="layer-panel-actions">' +
      '<button id="toggleAllBtn" class="layer-btn toggle-all-btn" onclick="toggleAllLayers()">Hide All</button>' +
    '</div>' +
    '<div class="layer-panel-buttons">' +
      layerButtonsHtml +
    '</div>' +
  '</div>';
  
  let graphHtml = '<div class="graph-layout">' +
    layerPanelHtml +
    '<div class="graph-view">';
  if (treeNode && treeNode.children && treeNode.children.length > 0) {
    graphHtml += renderGraph(treeNode);
  } else {
    graphHtml += '<div class="empty-state">' +
      '<div class="empty-state-icon">◈</div>' +
      '<p>No dependencies to visualize</p>' +
    '</div>';
  }
  graphHtml += '</div></div>';
  
  document.getElementById('treeContainer').innerHTML = treeHeaderHtml + lazyImportsHtml + treeHtml;
  document.getElementById('graphContainer').innerHTML = graphHeaderHtml + graphHtml;
  
  requestAnimationFrame(function() {
    setupGraphInteractions();
    updateAllToggleButton();
    requestAnimationFrame(fitToScreen);
  });
}

// Event listeners
document.querySelectorAll('.function-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.function-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    showFunctionDetail(item.dataset.funcId);
  });
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
  });
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    document.querySelectorAll('.function-item').forEach(item => {
      if (filter === 'all' || item.dataset.impact === filter) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  });
});

document.getElementById('searchInput').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  document.querySelectorAll('.function-item').forEach(item => {
    const name = item.querySelector('.function-name').textContent.toLowerCase();
    const file = item.querySelector('.function-meta').textContent.toLowerCase();
    if (name.includes(query) || file.includes(query)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
});

// Select first function by default
const firstFunc = document.querySelector('.function-item');
if (firstFunc) firstFunc.click();
</script>`;
  }
}

// Export singleton instance
export const htmlFormatPlugin = new HtmlFormatPlugin();
