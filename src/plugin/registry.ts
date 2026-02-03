// Plugin registry for managing format plugins

import type { FormatPlugin, PluginRegistry } from './types.js';

/**
 * Default plugin registry implementation
 */
class DefaultPluginRegistry implements PluginRegistry {
  private plugins = new Map<string, FormatPlugin>();

  register(plugin: FormatPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  get(name: string): FormatPlugin | undefined {
    return this.plugins.get(name);
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }

  getAvailableFormats(): string[] {
    return Array.from(this.plugins.keys());
  }
}

// Global registry instance
const globalRegistry = new DefaultPluginRegistry();

/**
 * Get the global plugin registry
 */
export function getRegistry(): PluginRegistry {
  return globalRegistry;
}

/**
 * Register a format plugin globally
 */
export function registerPlugin(plugin: FormatPlugin): void {
  globalRegistry.register(plugin);
}

/**
 * Get a format plugin by name
 */
export function getPlugin(name: string): FormatPlugin | undefined {
  return globalRegistry.get(name);
}

/**
 * Check if a plugin is registered
 */
export function hasPlugin(name: string): boolean {
  return globalRegistry.has(name);
}

/**
 * Get all available format names
 */
export function getAvailableFormats(): string[] {
  return globalRegistry.getAvailableFormats();
}
