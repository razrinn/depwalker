// Plugin system types for formatters

import type { AnalysisResult } from '../types.js';

/**
 * Format plugin interface - all format plugins must implement this
 */
export interface FormatPlugin {
  /** Unique format identifier (e.g., 'markdown', 'html') */
  readonly name: string;

  /** File extension for this format (e.g., 'md', 'html') */
  readonly extension: string;

  /** Content type for HTTP responses */
  readonly contentType: string;

  /**
   * Generate report from analysis result
   * @param result Analysis result data
   * @param maxDepth Maximum depth for impact analysis (null for unlimited)
   * @returns Formatted report string
   */
  generate(result: AnalysisResult, maxDepth: number | null): string;
}

/**
 * Plugin registry for managing format plugins
 */
export interface PluginRegistry {
  /** Register a format plugin */
  register(plugin: FormatPlugin): void;

  /** Get a plugin by name */
  get(name: string): FormatPlugin | undefined;

  /** Check if a plugin is registered */
  has(name: string): boolean;

  /** Get all registered plugin names */
  getAvailableFormats(): string[];
}
