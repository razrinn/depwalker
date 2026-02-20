// Formatter entry point - delegates to format plugins

import type { AnalysisResult, OutputFormat } from './types.js';
import {
  registerPlugin,
  getPlugin,
  markdownFormatPlugin,
  htmlFormatPlugin,
} from './plugin/index.js';

// Register built-in plugins
registerPlugin(markdownFormatPlugin);
registerPlugin(htmlFormatPlugin);

/**
 * Generate report string with specified format
 */
export function generateReport(
  result: AnalysisResult,
  format: OutputFormat = 'markdown',
  maxDepth: number | null = null
): string {
  const plugin = getPlugin(format);
  if (!plugin) {
    throw new Error(`Unknown format: ${format}. Available formats: markdown, html`);
  }
  return plugin.generate(result, maxDepth);
}
