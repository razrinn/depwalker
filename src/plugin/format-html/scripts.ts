// JavaScript code generation for HTML format plugin

import type { TreeNode, EntryPoint } from '../shared/tree-builder.js';
import type { FunctionGroup } from './types.js';
import { generateGraphScript } from './graph.js';
import { generateTreeScript } from './tree.js';
import { renderDetailView, escapeHtml } from './templates.js';

/**
 * Generate the full JavaScript code for the HTML report
 */
export function generateScripts(
  treeData: (TreeNode | null)[],
  functionGroups: FunctionGroup[],
  entryPoints: EntryPoint[]
): string {
  const functionData = functionGroups.flatMap(g => [g.primary, ...g.related]);
  
  return `
const treeData = ${JSON.stringify(treeData)};
const functionGroups = ${JSON.stringify(functionGroups)};
const entryPointsData = ${JSON.stringify(entryPoints)};
const entryPointIds = new Set(entryPointsData.map(ep => ep.id));

// Flatten for easy lookup
const functionData = ${JSON.stringify(functionData)};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Global set to track rendered nodes across the entire tree
const renderedNodes = new Map();

${generateTreeScript()}

${generateGraphScript()}

function showFunctionDetail(funcId) {
  const func = functionData.find(function(f) { return f.funcId === funcId; });
  if (!func) return;
  
  // Update sidebar active state
  document.querySelectorAll('.function-item').forEach(i => i.classList.remove('active'));
  const sidebarItem = document.querySelector('.function-item[data-func-id="' + funcId + '"]');
  if (sidebarItem) {
    sidebarItem.classList.add('active');
  }
  
  // Find the group this function belongs to
  const group = functionGroups.find(function(g) { 
    return g.primary.funcId === funcId || g.related.some(function(r) { return r.funcId === funcId; });
  });
  
  // Reset shared reference tracking for new function view
  renderedNodes.clear();
  
  const treeNode = treeData.find(function(t) { return t && t.id === funcId; });
  
  // Related functions section
  let relatedFunctionsHtml = '';
  if (group && group.related.length > 0) {
    const isPrimary = group.primary.funcId === funcId;
    const otherFuncs = isPrimary ? group.related : [group.primary, ...group.related.filter(function(r) { return r.funcId !== funcId; })];
    
    relatedFunctionsHtml = '<div class="related-functions-section">' +
      '<div class="related-functions-title">' +
        (isPrimary ? 'Related Changed Functions in This File' : 'Other Functions in This Group') +
      '</div>' +
      '<div class="related-functions-list">' +
      otherFuncs.map(function(rf) {
        const isActive = rf.funcId === funcId;
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
      func.lazyImports.map(function(li) { 
        return '<span class="lazy-import-tag">📦 ' + escapeHtml(li.moduleSpecifier) + ' <span>@ L' + li.line + '</span></span>';
      }).join('') +
      '</div></div>';
  }
  
  const hasChildren = treeNode && treeNode.children && treeNode.children.length > 0;
  
  // Tree view
  let treeHtml = '';
  if (hasChildren) {
    treeHtml = renderTree(treeNode, 0);
  } else {
    treeHtml = '<div class="empty-state" style="min-height: 200px;">' +
      '<div class="empty-state-icon">✓</div>' +
      '<h3>No dependencies</h3>' +
      '<p>This change is safe - no other functions depend on it</p>' +
    '</div>';
  }
  
  // Graph view
  let graphHtml = '';
  if (hasChildren) {
    graphHtml = renderGraph(treeNode);
  } else {
    graphHtml = '<div class="empty-state" style="min-height: 200px;">' +
      '<div class="empty-state-icon">◈</div>' +
      '<h3>No graph to display</h3>' +
      '<p>No dependency relationships to visualize</p>' +
    '</div>';
  }
  
  const html = '<div class="detail-header ' + func.impactLevel + '">' +
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
    '<div class="tree-container">' + treeHtml + '</div>' +
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
      graphHtml +
    '</div>' +
  '</div>';
  
  document.getElementById('detailContainer').innerHTML = html;
  
  // Setup tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
    });
  });
  
  // Setup graph interactions if graph exists
  if (hasChildren) {
    requestAnimationFrame(function() {
      setupGraphInteractions();
      requestAnimationFrame(fitToScreen);
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Event listeners for function items
  document.querySelectorAll('.function-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.function-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      if (item.dataset.funcId) {
        showFunctionDetail(item.dataset.funcId);
      }
    });
  });

  // Filter pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const filter = pill.dataset.filter;
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      
      document.querySelectorAll('.function-item').forEach(item => {
        if (filter === 'all' || item.dataset.impact === filter) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  // Search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
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
  }

  // Select first function by default (with a small delay to ensure DOM is fully rendered)
  setTimeout(() => {
    const firstFunc = document.querySelector('.function-item');
    if (firstFunc && !document.querySelector('.function-item.active')) {
      firstFunc.classList.add('active');
      if (firstFunc.dataset.funcId) {
        showFunctionDetail(firstFunc.dataset.funcId);
      }
    }
  }, 0);
});

// Handle fullscreen change events (for when user presses Escape)
document.addEventListener('fullscreenchange', () => {
  const graphWrapper = document.querySelector('.graph-wrapper');
  if (!graphWrapper) return;
  
  if (!document.fullscreenElement && graphWrapper.classList.contains('fullscreen')) {
    graphWrapper.classList.remove('fullscreen');
    setTimeout(() => fitToScreen(), 100);
  }
});

// Keyboard shortcut for fullscreen (F)
document.addEventListener('keydown', (e) => {
  if (e.key === 'f' || e.key === 'F') {
    const graphTab = document.getElementById('graphTab');
    if (graphTab && graphTab.classList.contains('active')) {
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        toggleFullscreen();
      }
    }
  }
});
`;
}
