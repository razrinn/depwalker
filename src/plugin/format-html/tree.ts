// Tree view rendering logic for HTML format plugin

import type { TreeNode } from '../shared/tree-builder.js';

/**
 * Generate the JavaScript code for tree view functionality
 */
export function generateTreeScript(): string {
  return `
function renderTree(node, level, visited) {
  if (!node) return '';
  level = level || 0;
  visited = visited || new Set();
  
  // Check if this node has already been rendered (shared reference)
  if (visited.has(node.id)) {
    const location = node.file.split('/').pop() + ':' + node.line;
    
    let html = '<div class="tree-node">';
    html += '<div class="tree-content shared-ref" style="padding-left: ' + (level * 20) + 'px" data-node-id="' + escapeHtml(node.id) + '" data-shared="true">' +
      '<span class="tree-toggle leaf"></span>' +
      '<span class="tree-icon">↺</span>' +
      '<span class="tree-label">' + escapeHtml(node.name) + '</span>' +
      '<span class="shared-ref-badge" onclick="scrollToNode(&#39;' + escapeHtml(node.id) + '&#39;)" title="Click to see original">shared</span>' +
      '<span class="tree-location">' + escapeHtml(location) + '</span>' +
    '</div>';
    html += '</div>';
    return html;
  }
  
  visited.add(node.id);
  renderedNodes.set(node.id, { level: level });
  
  const hasChildren = node.children && node.children.length > 0;
  const toggleClass = hasChildren ? 'expanded' : 'leaf';
  const location = level === 0 
    ? node.file + ':' + node.line 
    : node.file.split('/').pop() + ':' + node.line;
  
  const isEntryPoint = !hasChildren || entryPointIds.has(node.id);
  const entryPointBadge = isEntryPoint ? '<span class="entry-point-badge" title="Test this entry point">🎯</span>' : '';
  
  let html = '<div class="tree-node" id="tree-node-' + escapeHtml(node.id).replace(/[^a-zA-Z0-9_-]/g, '_') + '">';
  html += '<div class="tree-content ' + (isEntryPoint ? 'entry-point' : '') + '" style="padding-left: ' + (level * 20) + 'px" data-node-id="' + escapeHtml(node.id) + '">' +
    '<span class="tree-toggle ' + toggleClass + '" onclick="toggleNode(this)"></span>' +
    '<span class="tree-icon">' + (hasChildren ? '⚡' : '●') + '</span>' +
    '<span class="tree-label ' + (level === 0 ? 'root' : '') + '">' + escapeHtml(node.name) + '</span>' +
    entryPointBadge +
    '<span class="tree-location">' + escapeHtml(location) + '</span>' +
  '</div>';
  
  if (hasChildren) {
    html += '<div class="tree-children">';
    for (const child of node.children) {
      html += renderTree(child, level + 1, new Set(visited));
    }
    html += '</div>';
  }
  
  html += '</div>';
  return html;
}

function scrollToNode(nodeId) {
  const safeId = 'tree-node-' + nodeId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const element = document.getElementById(safeId);
  if (element) {
    const content = element.querySelector('.tree-content');
    if (content) {
      content.classList.add('shared-ref-highlight');
      content.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        content.classList.remove('shared-ref-highlight');
      }, 3000);
    }
  }
}

function toggleNode(el) {
  if (el.classList.contains('leaf')) return;
  el.classList.toggle('collapsed');
  el.classList.toggle('expanded');
  const children = el.closest('.tree-node').querySelector('.tree-children');
  if (children) children.classList.toggle('collapsed');
}
`;
}
