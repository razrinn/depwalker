// HTML templates for format-html plugin

import { truncatePath } from '../shared/utils.js';
import type { FunctionGroup } from './types.js';
import type { EntryPoint } from '../shared/tree-builder.js';

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
 * Render the sidebar HTML
 */
export function renderSidebar(functionGroups: FunctionGroup[]): string {
  const totalFunctions = functionGroups.reduce((sum, g) => sum + 1 + g.related.length, 0);
  const groupedCount = functionGroups.filter(g => g.related.length > 0).length;
  
  // Build function items for ALL functions (primary + related)
  const functionItems: string[] = [];
  for (const group of functionGroups) {
    const primary = group.primary;
    const hasRelated = group.related.length > 0;
    functionItems.push(`
      <div class="function-item ${hasRelated ? 'has-related' : ''}" data-func-id="${escapeHtml(primary.funcId)}" data-impact="${primary.impactLevel}">
        <div class="impact-dot ${primary.impactLevel}"></div>
        <div class="function-info">
          <div class="function-name">${escapeHtml(primary.name)} ${hasRelated ? '<span class="related-badge">+' + group.related.length + '</span>' : ''}</div>
          <div class="function-meta">${truncatePath(primary.file)}:${primary.line}${hasRelated ? ' · has related' : ''}</div>
        </div>
        <span class="function-badge">${primary.dependents}</span>
      </div>`);
    
    for (const related of group.related) {
      functionItems.push(`
      <div class="function-item related-item" data-func-id="${escapeHtml(related.funcId)}" data-impact="${related.impactLevel}">
        <div class="impact-dot ${related.impactLevel}"></div>
        <div class="function-info">
          <div class="function-name">${escapeHtml(related.name)}</div>
          <div class="function-meta">${truncatePath(related.file)}:${related.line}</div>
        </div>
        <span class="function-badge">${related.dependents}</span>
      </div>`);
    }
  }

  // Stats use primary functions only
  const primaryItems = functionGroups.map(g => g.primary);
  const criticalCount = primaryItems.filter(i => i.impactLevel === 'critical').length;
  const highCount = primaryItems.filter(i => i.impactLevel === 'high').length;
  const mediumCount = primaryItems.filter(i => i.impactLevel === 'medium').length;
  const lowCount = primaryItems.filter(i => i.impactLevel === 'low').length;

  return `<aside class="sidebar">
  <div class="sidebar-header">
    <div class="brand">
      <div class="brand-icon">◈</div>
      <div class="brand-text">
        <h1>Depwalker</h1>
        <div class="version">Impact Analysis</div>
      </div>
    </div>
  </div>
  
  <div class="sidebar-stats">
    <div class="sidebar-stat">
      <div class="sidebar-stat-value critical">${criticalCount}</div>
      <div class="sidebar-stat-label">Critical</div>
    </div>
    <div class="sidebar-stat">
      <div class="sidebar-stat-value high">${highCount}</div>
      <div class="sidebar-stat-label">High</div>
    </div>
    <div class="sidebar-stat">
      <div class="sidebar-stat-value medium">${mediumCount}</div>
      <div class="sidebar-stat-label">Medium</div>
    </div>
    <div class="sidebar-stat">
      <div class="sidebar-stat-value low">${lowCount}</div>
      <div class="sidebar-stat-label">Low</div>
    </div>
  </div>
  
  <div class="sidebar-controls">
    <div class="search-box">
      <input type="text" id="searchInput" placeholder="Search functions...">
    </div>
    <div class="filter-pills">
      <button class="filter-pill active" data-filter="all">All</button>
      <button class="filter-pill" data-filter="critical">Critical</button>
      <button class="filter-pill" data-filter="high">High</button>
      <button class="filter-pill" data-filter="medium">Medium</button>
      <button class="filter-pill" data-filter="low">Low</button>
    </div>
  </div>
  
  <div class="function-list-header">
    ${groupedCount > 0 ? `Changed Functions <span>${totalFunctions} in ${functionGroups.length} groups</span>` : `Changed Functions <span>${totalFunctions}</span>`}
  </div>
  <div class="function-list" id="functionList">
    ${functionItems.join('')}
  </div>
</aside>`;
}

/**
 * Render entry points panel
 */
export function renderEntryPoints(entryPoints: EntryPoint[]): string {
  if (entryPoints.length === 0) {
    return `<div class="entry-points-card empty">
  <div class="entry-points-header">
    <div class="entry-points-icon">🎯</div>
    <div class="entry-points-title">
      <h3>Entry Points</h3>
      <p>No entry points found</p>
    </div>
    <span class="entry-points-count">0</span>
  </div>
  <div class="entry-points-content">
    <p class="empty-state" style="min-height: auto; padding: var(--space-5);">
      Your changes may not affect any testable code paths.
    </p>
  </div>
</div>`;
  }

  // Group by file
  const byFile = new Map<string, EntryPoint[]>();
  for (const ep of entryPoints) {
    if (!byFile.has(ep.file)) {
      byFile.set(ep.file, []);
    }
    byFile.get(ep.file)!.push(ep);
  }

  let itemsHtml = '';
  for (const [file, points] of byFile) {
    const fileEntryPoints = points.map(ep => {
      const priorityClass = ep.depth >= 3 ? 'priority-high' : ep.depth >= 1 ? 'priority-medium' : 'priority-low';
      const depthLabel = ep.depth === 0 ? 'direct' : `${ep.depth} lvl`;
      return `<span class="entry-point-tag ${priorityClass}" title="${ep.name} (${file}:${ep.line})">${ep.name} <small>(${depthLabel})</small></span>`;
    }).join('');
    
    itemsHtml += `
      <div class="entry-point-file">
        <div class="entry-point-file-path">${truncatePath(file)}</div>
        <div class="entry-point-tags">${fileEntryPoints}</div>
      </div>`;
  }

  return `<div class="entry-points-card">
  <div class="entry-points-header">
    <div class="entry-points-icon">🎯</div>
    <div class="entry-points-title">
      <h3>Test Entry Points</h3>
      <p>Functions to test your changes</p>
    </div>
    <span class="entry-points-count">${entryPoints.length}</span>
  </div>
  <div class="entry-points-content">
    ${itemsHtml}
  </div>
</div>`;
}

/**
 * Render main content area
 */
export function renderMainContent(
  stats: {
    changedFiles: number;
    changedFunctions: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    none: number;
  },
  functionGroups: FunctionGroup[],
  entryPoints: EntryPoint[]
): string {
  return `<main class="main-content">
  <div class="stats-bar">
    <div class="stat-item">
      <div class="stat-item-label">Changed Files</div>
      <div class="stat-item-value">${stats.changedFiles}</div>
    </div>
    <div class="stat-item">
      <div class="stat-item-label">Changed Functions</div>
      <div class="stat-item-value">${stats.changedFunctions}</div>
    </div>
    <div class="stat-item">
      <div class="stat-item-label">Total Impact</div>
      <div class="stat-item-value">${functionGroups.reduce((sum, g) => sum + g.primary.dependents, 0)} deps</div>
    </div>
  </div>
  
  <div class="content-area">
    <div class="content-grid">
      <div class="primary-content">
        <div id="detailContainer">
          <div class="empty-state">
            <div class="empty-state-icon">◈</div>
            <h3>Select a function</h3>
            <p>Choose a changed function from the sidebar to view its impact analysis</p>
          </div>
        </div>
      </div>
      
      <aside class="secondary-content">
        ${renderEntryPoints(entryPoints)}
      </aside>
    </div>
  </div>
</main>`;
}

/**
 * Render detail view HTML for a specific function
 */
export function renderDetailView(
  func: {
    name: string;
    file: string;
    line: number;
    score: number;
    dependents: number;
    depth: number;
    impactLevel: string;
    lazyImports?: Array<{ moduleSpecifier: string; line: number }>;
  },
  group: FunctionGroup | undefined,
  treeNode: { id: string; name: string; file: string; line: number; children: unknown[] } | null | undefined,
  isActiveFunc: (funcId: string) => boolean
): string {
  // Related functions section
  let relatedFunctionsHtml = '';
  if (group && group.related.length > 0) {
    const isPrimary = group.primary.funcId === func.file + ':' + func.name;
    const otherFuncs = isPrimary 
      ? group.related 
      : [group.primary, ...group.related.filter(r => r.funcId !== func.file + ':' + func.name)];
    
    relatedFunctionsHtml = '<div class="related-functions-section">' +
      '<div class="related-functions-title">' +
        (isPrimary ? 'Related Changed Functions in This File' : 'Other Functions in This Group') +
      '</div>' +
      '<div class="related-functions-list">' +
      otherFuncs.map(rf => {
        const isActive = isActiveFunc(rf.funcId);
        return '<button class="related-function-btn ' + (isActive ? 'active' : '') + '" onclick="showFunctionDetail(&#39;' + escapeHtml(rf.funcId) + '&#39;)" data-func-id="' + escapeHtml(rf.funcId) + '">' +
          '<span class="rf-name">' + escapeHtml(rf.name) + '</span>' +
          '<span class="rf-line">@ L' + rf.line + '</span>' +
          '<span class="rf-badge ' + rf.impactLevel + '">' + rf.impactLevel + '</span>' +
        '</button>';
      }).join('') +
      '</div></div>';
  }
  
  // Lazy imports section
  let lazyImportsHtml = '';
  if (func.lazyImports && func.lazyImports.length > 0) {
    lazyImportsHtml = '<div class="lazy-imports-section">' +
      '<div class="lazy-imports-title">Dynamic Imports</div>' +
      '<div class="lazy-imports-list">' +
      func.lazyImports.map(li => 
        '<span class="lazy-import-tag">📦 ' + escapeHtml(li.moduleSpecifier) + ' <span>@ L' + li.line + '</span></span>'
      ).join('') +
      '</div></div>';
  }
  
  const hasChildren = treeNode && treeNode.children && treeNode.children.length > 0;
  
  // Tree view placeholder - will be filled by JavaScript
  const treeHtml = hasChildren ? '' : '<div class="empty-state" style="min-height: 200px;">' +
    '<div class="empty-state-icon">✓</div>' +
    '<h3>No dependencies</h3>' +
    '<p>This change is safe - no other functions depend on it</p>' +
  '</div>';
  
  // Graph view placeholder - will be filled by JavaScript
  const graphHtml = hasChildren ? '' : '<div class="empty-state" style="min-height: 200px;">' +
    '<div class="empty-state-icon">◈</div>' +
    '<h3>No graph to display</h3>' +
    '<p>No dependency relationships to visualize</p>' +
  '</div>';
  
  return '<div class="detail-header ' + func.impactLevel + '">' +
    '<div class="detail-header-content">' +
      '<div class="detail-title-group">' +
        '<div class="detail-title">' + escapeHtml(func.name) + '</div>' +
        '<div class="detail-subtitle">' +
          '<span>📁 ' + escapeHtml(func.file) + ':' + func.line + '</span>' +
          '<span>⚡ Score: ' + func.score + '</span>' +
          '<span>🔗 ' + func.dependents + ' dependents</span>' +
          '<span>📊 depth ' + func.depth + '</span>' +
        '</div>' +
      '</div>' +
      '<span class="detail-badge ' + func.impactLevel + '">' + func.impactLevel + '</span>' +
    '</div>' +
  '</div>' +
  relatedFunctionsHtml +
  lazyImportsHtml +
  '<div class="tabs">' +
    '<button class="tab active" data-tab="tree">' +
      '<span>🌳</span> Tree View' +
    '</button>' +
    '<button class="tab" data-tab="graph">' +
      '<span>🕸️</span> Graph View' +
    '</button>' +
  '</div>' +
  '<div class="tab-content active" id="treeTab">' +
    '<div class="tree-container" id="treeContainer">' + treeHtml + '</div>' +
  '</div>' +
  '<div class="tab-content" id="graphTab">' +
    '<div class="graph-wrapper">' +
      '<div class="graph-header">' +
        '<div class="card-title">' +
          '<span class="card-title-icon">🕸️</span>' +
          'Dependency Graph' +
        '</div>' +
        '<div class="graph-controls">' +
          '<button class="graph-btn" onclick="zoomOut()" title="Zoom out">−</button>' +
          '<span class="zoom-level" id="zoomLevel">100%</span>' +
          '<button class="graph-btn" onclick="zoomIn()" title="Zoom in">+</button>' +
          '<button class="graph-btn" onclick="fitToScreen()" title="Fit to screen">⟲</button>' +
          '<button class="graph-btn" onclick="resetZoom()" title="Reset">⌂</button>' +
          '<button class="graph-btn" onclick="toggleFullscreen()" title="Toggle fullscreen (F)">⛶</button>' +
        '</div>' +
      '</div>' +
      '<div id="graphContainer">' + graphHtml + '</div>' +
    '</div>' +
  '</div>';
}

/**
 * Render the full HTML page
 */
export function renderHtml(
  version: string,
  styles: string,
  sidebar: string,
  mainContent: string,
  scripts: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Depwalker v${version} - Impact Analysis</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>${styles}</style>
</head>
<body>
  <div class="app">
    ${sidebar}
    ${mainContent}
  </div>
  <script>${scripts}</script>
</body>
</html>`;
}
