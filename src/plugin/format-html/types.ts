// Types for HTML format plugin

import type { ImpactedItem } from '../shared/utils.js';
import type { TreeNode, EntryPoint } from '../shared/tree-builder.js';

/**
 * Group of related changed functions (same file, overlapping impact)
 */
export interface FunctionGroup {
  primary: ImpactedItem;
  related: ImpactedItem[];
  allFuncIds: string[];
}

/**
 * Graph node for radial layout
 */
export interface GraphNode {
  id: string;
  name: string;
  file: string;
  depth: number;
  isRoot: boolean;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  angle: number;
  radius: number;
  sectorStart: number;
  sectorEnd: number;
  parentId: string | null;
}

/**
 * Graph link for radial layout
 */
export interface GraphLink {
  source: string;
  target: string;
  circular: boolean;
}

/**
 * Radial layout result
 */
export interface RadialLayout {
  nodes: GraphNode[];
  links: GraphLink[];
  nodeMap: Map<string, GraphNode>;
}

/**
 * Graph state for interactions
 */
export interface GraphState {
  scale: number;
  translateX: number;
  translateY: number;
  isDragging: boolean;
  lastX: number;
  lastY: number;
  minScale: number;
  maxScale: number;
  visibleLayers: Set<number>;
}

/**
 * Props for sidebar rendering
 */
export interface SidebarProps {
  functionGroups: FunctionGroup[];
}

/**
 * Props for main content rendering
 */
export interface MainContentProps {
  stats: {
    changedFiles: number;
    changedFunctions: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    none: number;
  };
  functionGroups: FunctionGroup[];
  entryPoints: EntryPoint[];
}

/**
 * Props for script rendering
 */
export interface ScriptsProps {
  treeData: (TreeNode | null)[];
  functionGroups: FunctionGroup[];
  entryPoints: EntryPoint[];
}

/**
 * Props for detail view rendering
 */
export interface DetailProps {
  func: ImpactedItem;
  group: FunctionGroup | undefined;
  treeNode: TreeNode | null | undefined;
}
