// Formatter entry point - delegates to format plugins
// This file maintains backward compatibility with existing code

import type { AnalysisResult, OutputFormat } from './types.js';
import {
  registerPlugin,
  getPlugin,
  hasPlugin,
  markdownFormatPlugin,
  htmlFormatPlugin,
} from './plugin/index.js';

// Register built-in plugins
registerPlugin(markdownFormatPlugin);
registerPlugin(htmlFormatPlugin);

/**
 * Generate markdown analysis report
 * @deprecated Use format plugins directly instead
 */
export function generateMarkdownReport(
  result: AnalysisResult,
  maxDepth: number | null = null
): string {
  return markdownFormatPlugin.generate(result, maxDepth);
}

/**
 * Generate interactive HTML analysis report
 * @deprecated Use format plugins directly instead
 */
export function generateHtmlReport(
  result: AnalysisResult,
  maxDepth: number | null = null
): string {
  return htmlFormatPlugin.generate(result, maxDepth);
}

/**
 * Print analysis results with specified format
 */
export function printResults(
  result: AnalysisResult,
  maxDepth: number | null = null,
  format: OutputFormat = 'markdown'
): void {
  console.log(generateReport(result, format, maxDepth));
}

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

// Re-export shared utilities for backward compatibility
export {
  truncatePath,
  calculateImpactScore,
  getImpactLevel,
  getImpactLabel,
  buildImpactTree,
} from './plugin/index.js';
