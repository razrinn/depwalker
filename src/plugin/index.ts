// Plugin system for DepWalker formatters

// Export types
export type { FormatPlugin, PluginRegistry } from './types.js';

// Export registry functions
export {
  getRegistry,
  registerPlugin,
  getPlugin,
  hasPlugin,
  getAvailableFormats,
} from './registry.js';

// Export shared utilities
export {
  truncatePath,
  collectAllDependents,
  getMaxImpactDepth,
  calculateImpactScore,
  getImpactLevel,
  getImpactLabel,
  groupCallersByFile,
  buildImpactedItems,
  calculateStats,
  type ImpactLevel,
  type ImpactScore,
  type ImpactedItem,
  type ReportStats,
} from './shared/utils.js';

// Export tree builder
export {
  buildTreeData,
  buildImpactTree,
  type TreeNode,
} from './shared/tree-builder.js';

// Export format plugins
export { MarkdownFormatPlugin, markdownFormatPlugin } from './format-markdown/index.js';
export { HtmlFormatPlugin, htmlFormatPlugin } from './format-html/index.js';
