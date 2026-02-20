// Minimal JavaScript for HTML format plugin (tree collapse/expand)

/**
 * Generate the JavaScript code for tree toggle functionality
 */
export function generateScripts(): string {
  return `
function toggleNode(el) {
  const node = el.closest('.tree-node');
  if (!node) return;
  const children = node.querySelector(':scope > .tree-children');
  if (!children) return;
  const isCollapsed = children.classList.toggle('collapsed');
  el.textContent = isCollapsed ? '▶' : '▼';
}
`;
}
