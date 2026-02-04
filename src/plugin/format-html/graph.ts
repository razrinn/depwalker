// Graph visualization logic for HTML format plugin

import type { TreeNode } from '../shared/tree-builder.js';
import type { GraphState, RadialLayout, GraphNode, GraphLink } from './types.js';

/**
 * Get maximum depth of a tree node
 */
export function getMaxDepth(node: TreeNode | null, visited: Set<string> = new Set()): number {
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

/**
 * Calculate leaf counts for radial layout
 */
export function calcLeafCounts(node: TreeNode | null, leafCounts: Map<string, number> = new Map()): number {
  if (!node) return 0;
  if (leafCounts.has(node.id)) return leafCounts.get(node.id) || 0;
  
  const hasChildren = node.children && node.children.length > 0;
  let count = 0;
  
  if (!hasChildren) {
    count = 1;
  } else {
    for (const child of node.children) {
      count += calcLeafCounts(child, leafCounts);
    }
  }
  
  leafCounts.set(node.id, Math.max(count, 1));
  return Math.max(count, 1);
}

/**
 * Build radial layout for graph visualization
 */
export function buildRadialLayout(rootNode: TreeNode | null): RadialLayout {
  if (!rootNode) return { nodes: [], links: [], nodeMap: new Map() };
  
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeMap = new Map<string, GraphNode>();
  const visited = new Set<string>();
  const leafCounts = new Map<string, number>();
  
  calcLeafCounts(rootNode, leafCounts);
  
  function assignPositions(
    node: TreeNode,
    depth: number,
    startAngle: number,
    endAngle: number,
    parentId: string | null
  ): void {
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
    
    const graphNode: GraphNode = {
      id: node.id,
      name: node.name,
      file: node.file.split('/').pop() || node.file,
      depth,
      isRoot: depth === 0,
      x,
      y,
      targetX: x,
      targetY: y,
      angle: midAngle,
      radius,
      sectorStart: startAngle,
      sectorEnd: endAngle,
      parentId,
    };
    
    nodes.push(graphNode);
    nodeMap.set(node.id, graphNode);
    
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

/**
 * Apply force-directed adjustments to node positions
 */
export function applyForceDirectedLayout(
  nodes: GraphNode[],
  nodeWidth: number,
  nodeHeight: number,
  iterations = 200
): void {
  const minDistX = nodeWidth + 20;
  const minDistY = nodeHeight + 20;
  
  for (let iteration = 0; iteration < iterations; iteration++) {
    let moved = false;
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!;
        const b = nodes[j]!;
        
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
          
          let pushX!: number, pushY!: number;
          const pushAmount = 3 * (1 - iteration / 250);
          
          if (similarAngle) {
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
}

/**
 * Generate the JavaScript code for graph functionality
 */
export function generateGraphScript(): string {
  return `
// Graph state and functions
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

let selectedNodeId = null;

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

function calcLeafCounts(node, leafCounts) {
  if (!node || leafCounts.has(node.id)) return leafCounts.get(node.id) || 0;
  
  let count = 0;
  const hasChildren = node.children && node.children.length > 0;
  
  if (!hasChildren) {
    count = 1;
  } else {
    for (const child of node.children) {
      count += calcLeafCounts(child, leafCounts);
    }
  }
  
  leafCounts.set(node.id, Math.max(count, 1));
  return Math.max(count, 1);
}

function buildRadialLayout(rootNode) {
  if (!rootNode) return { nodes: [], links: [], nodeMap: new Map() };
  
  const nodes = [];
  const links = [];
  const nodeMap = new Map();
  const visited = new Set();
  const leafCounts = new Map();
  
  calcLeafCounts(rootNode, leafCounts);
  
  function assignPositions(node, depth, startAngle, endAngle, parentId) {
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
  
  // Force-directed adjustment
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
  
  // Build layer panel HTML
  let layerButtonsHtml = '';
  for (let i = 0; i <= maxNodeDepth; i++) {
    const label = i === 0 ? 'R' : 'L' + i;
    layerButtonsHtml += '<button class="layer-btn active" data-layer="' + i + '" onclick="toggleLayer(' + i + ')">' + label + '</button>';
  }
  
  // Track convergence (multiple incoming edges to same target)
  const incomingCounts = new Map();
  links.forEach(link => {
    incomingCounts.set(link.target, (incomingCounts.get(link.target) || 0) + 1);
  });
  
  // Track edge angles for each target to fan out converging edges
  const targetEdgeAngles = new Map();
  
  const linkIds = new Map();
  
  let linksHtml = '';
  links.forEach((link, idx) => {
    const source = nodeMap.get(link.source);
    const target = nodeMap.get(link.target);
    if (source && target) {
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      
      const baseAngle = Math.atan2(dy, dx);
      
      // Calculate edge offset for converging edges
      let edgeOffset = 0;
      const incomingCount = incomingCounts.get(link.target) || 1;
      if (incomingCount > 1) {
        if (!targetEdgeAngles.has(link.target)) {
          targetEdgeAngles.set(link.target, []);
        }
        const angles = targetEdgeAngles.get(link.target);
        edgeOffset = (angles.length - (incomingCount - 1) / 2) * 15;
        angles.push(baseAngle);
      }
      
      // Calculate start/end points with node padding
      const startX = source.x + Math.cos(baseAngle) * (nodeWidth / 2);
      const startY = source.y + Math.sin(baseAngle) * (nodeHeight / 2);
      const endX = target.x - Math.cos(baseAngle) * (nodeWidth / 2);
      const endY = target.y - Math.sin(baseAngle) * (nodeHeight / 2);
      
      // Create curved path using quadratic Bezier curve
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      
      let controlX = midX;
      let controlY = midY;
      
      if (edgeOffset !== 0) {
        const perpX = -Math.sin(baseAngle) * edgeOffset * 2;
        const perpY = Math.cos(baseAngle) * edgeOffset * 2;
        controlX += perpX;
        controlY += perpY;
      }
      
      const linkId = 'link-' + link.source + '-' + link.target;
      linkIds.set(link.source + '-' + link.target, linkId);
      
      const pathData = 'M ' + startX + ' ' + startY + ' Q ' + controlX + ' ' + controlY + ' ' + endX + ' ' + endY;
      
      linksHtml += '<path id="' + linkId + '" class="graph-link' + (link.circular ? ' highlighted' : '') + (incomingCount > 1 ? ' converging' : '') + '" ' +
        'data-source="' + link.source + '" data-target="' + link.target + '" ' +
        'd="' + pathData + '"' +
        (link.circular ? '' : ' marker-end="url(#arrowhead)"') + '/>';
    }
  });
  
  let nodesHtml = '';
  nodes.forEach(n => {
    const color = n.isRoot ? 'var(--green-200)' : 
      n.depth === 1 ? 'var(--high)' : 
      n.depth === 2 ? 'var(--medium)' : 'var(--low)';
    
    const displayName = n.name.length > 16 ? n.name.substring(0, 16) + '..' : n.name;
    
    const incomingCount = incomingCounts.get(n.id) || 0;
    const hasConvergence = incomingCount > 1;
    
    nodesHtml += '<g class="graph-node' + (n.isRoot ? ' graph-node-root' : '') + (hasConvergence ? ' convergence-hub' : '') + '" ' +
      'transform="translate(' + (n.x - nodeWidth/2) + ',' + (n.y - nodeHeight/2) + ')"' +
      ' data-node-id="' + n.id.replace(/"/g, '&quot;') + '"' +
      ' data-depth="' + n.depth + '"' +
      ' data-incoming="' + incomingCount + '">' +
      '<rect width="' + nodeWidth + '" height="' + nodeHeight + '" fill="var(--bg-tertiary)" stroke="' + color + '"/>' +
      '<text x="' + (nodeWidth/2) + '" y="' + (nodeHeight/2 - 6) + '" text-anchor="middle" font-weight="500" font-size="10px">' + 
        escapeHtml(displayName) + '</text>' +
      '<text class="node-file" x="' + (nodeWidth/2) + '" y="' + (nodeHeight/2 + 10) + '" text-anchor="middle">' + 
        escapeHtml(n.file) + '</text>';
    
    if (hasConvergence) {
      nodesHtml += '<circle cx="' + (nodeWidth - 8) + '" cy="8" r="8" fill="var(--green-200)"/>' +
        '<text class="node-convergence-badge" x="' + (nodeWidth - 8) + '" y="8" text-anchor="middle" dy="0.3em">' + incomingCount + '</text>';
    }
    
    nodesHtml += '</g>';
  });
  
  let svg = '<div class="graph-container" id="graphContainerInner">' +
    '<div class="layer-panel">' + layerButtonsHtml + '</div>' +
    '<svg class="graph-svg" id="graphSvg" viewBox="' + minX + ' ' + minY + ' ' + boundsWidth + ' ' + boundsHeight + '">' +
    '<defs>' +
      '<marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">' +
        '<polygon points="0 0, 8 3, 0 6" fill="var(--border-secondary)" />' +
      '</marker>' +
      '<marker id="arrowhead-highlight" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">' +
        '<polygon points="0 0, 8 3, 0 6" fill="var(--green-200)" />' +
      '</marker>' +
    '</defs>' +
    '<g id="graphTransformGroup">' +
    linksHtml +
    nodesHtml +
    '</g></svg></div>';
  
  return svg;
}

function updateTransform() {
  graphState.scale = Math.max(graphState.minScale, Math.min(graphState.maxScale, graphState.scale));
  
  const group = document.getElementById('graphTransformGroup');
  if (group) {
    group.setAttribute('transform', 'translate(' + graphState.translateX + ',' + graphState.translateY + ') scale(' + graphState.scale + ')');
  }
  const zoomDisplay = document.getElementById('zoomLevel');
  if (zoomDisplay) {
    zoomDisplay.textContent = Math.round(graphState.scale * 100) + '%';
  }
}

function zoomIn() {
  graphState.scale = Math.min(graphState.maxScale, graphState.scale * 1.5);
  updateTransform();
}

function zoomOut() {
  graphState.scale = Math.max(graphState.minScale, graphState.scale / 1.5);
  updateTransform();
}

function resetZoom() {
  graphState.scale = 1;
  graphState.translateX = 0;
  graphState.translateY = 0;
  updateTransform();
}

function fitToScreen() {
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
  
  const padding = 40;
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
}

function toggleFullscreen() {
  const graphWrapper = document.querySelector('.graph-wrapper');
  if (!graphWrapper) return;
  
  if (graphWrapper.classList.contains('fullscreen')) {
    graphWrapper.classList.remove('fullscreen');
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen();
    }
  } else {
    graphWrapper.classList.add('fullscreen');
    if (graphWrapper.requestFullscreen) {
      graphWrapper.requestFullscreen().catch(err => {
        console.log('Fullscreen denied:', err);
      });
    }
  }
  
  setTimeout(() => {
    fitToScreen();
  }, 100);
}

function highlightNodeConnections(nodeId) {
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
  
  const selectedNode = svg.querySelector('.graph-node[data-node-id="' + nodeId + '"]');
  const incomingCount = selectedNode ? parseInt(selectedNode.getAttribute('data-incoming') || '0') : 0;
  
  if (incomingCount > 1) {
    svg.querySelectorAll('.graph-link[data-target="' + nodeId + '"]').forEach(link => {
      if (!connectedLinks.includes(link)) {
        connectedLinks.push(link);
        connectedNodes.add(link.getAttribute('data-source'));
      }
    });
  }
  
  const targets = connectedLinks.map(l => l.getAttribute('data-target'));
  targets.forEach(targetId => {
    const targetNode = svg.querySelector('.graph-node[data-node-id="' + targetId + '"]');
    if (targetNode) {
      const targetIncoming = parseInt(targetNode.getAttribute('data-incoming') || '0');
      if (targetIncoming > 1) {
        svg.querySelectorAll('.graph-link[data-target="' + targetId + '"]').forEach(link => {
          if (!connectedLinks.includes(link)) {
            connectedLinks.push(link);
            connectedNodes.add(link.getAttribute('data-source'));
          }
        });
      }
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
}

function clearHighlight() {
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
}

function toggleLayer(depth) {
  if (graphState.visibleLayers.has(depth)) {
    graphState.visibleLayers.delete(depth);
  } else {
    graphState.visibleLayers.add(depth);
  }
  updateLayerButtons();
  updateGraphVisibility();
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

function setupGraphInteractions() {
  const container = document.getElementById('graphContainerInner');
  const svg = document.getElementById('graphSvg');
  if (!container || !svg) return;
  
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  
  container.addEventListener('click', function(e) {
    if (isDragging) return;
    
    if (e.target.tagName === 'BUTTON' || e.target.closest('.layer-panel')) {
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
    
    if (e.target.id === 'graphSvg' || e.target.classList.contains('graph-container')) {
      clearHighlight();
    }
  });
  
  container.addEventListener('wheel', function(e) {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const isTrackpad = e.deltaMode === 0 && Math.abs(e.deltaY) < 50 && Math.abs(e.deltaX) < 50;
    
    if (e.ctrlKey || e.metaKey || (!isTrackpad && Math.abs(e.deltaY) > Math.abs(e.deltaX))) {
      const zoomSensitivity = isTrackpad ? 0.008 : 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.max(graphState.minScale, Math.min(graphState.maxScale, graphState.scale * (1 + delta)));
      
      const worldX = (mouseX - graphState.translateX) / graphState.scale;
      const worldY = (mouseY - graphState.translateY) / graphState.scale;
      
      graphState.translateX = mouseX - worldX * newScale;
      graphState.translateY = mouseY - worldY * newScale;
      graphState.scale = newScale;
    } else {
      const panSensitivity = isTrackpad ? 1.2 : 1.5;
      const multiplier = graphState.scale > 1 ? 1 : Math.max(0.5, graphState.scale);
      
      graphState.translateX -= e.deltaX * panSensitivity * multiplier;
      graphState.translateY -= e.deltaY * panSensitivity * multiplier;
    }
    
    updateTransform();
  }, { passive: false });
  
  container.addEventListener('mousedown', function(e) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('.layer-panel')) return;
    isDragging = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    graphState.isDragging = true;
    graphState.lastX = e.clientX;
    graphState.lastY = e.clientY;
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
    
    graphState.translateX += dx;
    graphState.translateY += dy;
    graphState.lastX = e.clientX;
    graphState.lastY = e.clientY;
    
    updateTransform();
  });
  
  window.addEventListener('mouseup', function() {
    graphState.isDragging = false;
    if (container) container.classList.remove('dragging');
  });
}
`;
}
