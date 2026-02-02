#!/usr/bin/env node
/**
 * Build script that bundles the CLI and injects version from package.json
 */
import { build } from 'esbuild';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Read version from package.json
const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));

await build({
  entryPoints: [join(rootDir, 'dist', 'index.js')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  external: ['commander', 'typescript'],
  outfile: join(rootDir, 'dist', 'index.js'),
  allowOverwrite: true,
  define: {
    'process.env.PKG_VERSION': JSON.stringify(pkg.version),
  },
});

console.log(`✓ Built depwalker v${pkg.version}`);
