# DepWalker - Agent Documentation

> **For AI Coding Agents:** Essential context for working with the DepWalker codebase.

## Project Overview

DepWalker is a TypeScript dependency analysis CLI tool that tracks the impact of code changes across a codebase. It analyzes Git changes and shows which functions are affected, along with their dependency chains.

### Key Features

- **Function Impact Analysis**: Traces function call chains from changed functions
- **Git Integration**: Automatically detects uncommitted changes via `git diff`
- **TypeScript Compiler API**: Uses native TS compiler for accurate AST analysis
- **Plugin-Based Output**: Extensible format system with Markdown and HTML plugins built-in

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript 5.9+ |
| Runtime | Node.js 18+ |
| Package Manager | pnpm 10.11.0 |
| Build Tool | TypeScript Compiler (tsc) + esbuild |
| CLI Framework | Commander.js |
| Release Management | Changesets |

## Project Structure

```
depwalker/
├── src/                      # Source code
│   ├── index.ts             # CLI entry point (Commander.js setup)
│   ├── git.ts               # Git diff parsing
│   ├── analyzer.ts          # Core analysis logic (AST analysis, call graph)
│   ├── formatter.ts         # Formatter entry point (plugin orchestration)
│   ├── types.ts             # TypeScript interfaces
│   └── plugin/              # Format plugin system
│       ├── types.ts         # Plugin interface definitions
│       ├── registry.ts      # Plugin registry
│       ├── index.ts         # Plugin exports
│       ├── shared/          # Shared utilities for plugins
│       │   ├── utils.ts     # Impact calculation, stats, helpers
│       │   └── tree-builder.ts  # Tree building and entry point collection
│       ├── format-markdown/ # Markdown format plugin
│       │   └── index.ts
│       └── format-html/     # HTML format plugin (modern premium design)
│           └── index.ts
├── scripts/                  # Build scripts
│   └── build.js             # esbuild bundler with version injection
├── dist/                     # Compiled & bundled output
├── .changeset/               # Changeset files for versioning
├── .github/workflows/        # CI/CD pipelines
├── package.json
├── tsconfig.json
├── README.md                # User documentation
├── AGENTS.md                # This file - agent documentation
├── CONTRIBUTING.md          # Contribution guidelines
└── RELEASE.md               # Release process guide
```

## Build Process

Two-stage build:

1. **TypeScript Compilation**: `tsc` compiles `.ts` files to `.js` in `dist/`
2. **Bundling**: `esbuild` bundles into single `dist/index.js`

```bash
pnpm build    # Full build
pnpm dev      # Watch mode
```

## Code Architecture

### Module Breakdown

#### 1. `src/index.ts` - CLI Entry Point
- Sets up Commander.js CLI
- Orchestrates the analysis pipeline
- Handles progress indicators (spinner)

**Options:**
- `--depth <number>`: Maximum analysis depth
- `--tsconfig <path>`: Custom tsconfig path
- `--output <file>`: Save report to file (default: temp file for HTML)
- `--format <format>`: Output format (`markdown`, `html`)
- `--no-open`: Disable auto-opening browser for HTML format

#### 2. `src/git.ts` - Git Integration
- `getGitDiff()`: Runs `git diff -U0 HEAD`
- `parseGitDiff()`: Extracts changed line numbers per file

#### 3. `src/analyzer.ts` - Core Analysis
- `createTsProgram()`: Creates TS compiler program
- `buildCallGraph()`: Builds function call graph using TS AST
- `findChangedFunctions()`: Identifies functions in changed line ranges

**Key Data Structure:**
```typescript
type CallGraph = Map<string, FunctionInfo>;
// "filepath:funcName" -> { callers: CallSite[], definition: { startLine, endLine } }
```

#### 4. `src/formatter.ts` - Formatter Entry Point
Thin wrapper that delegates to format plugins:
- Auto-registers built-in plugins (markdown, html)
- `generateReport()`: Routes to appropriate plugin
- Maintains backward compatibility with old API

#### 5. `src/plugin/` - Plugin System

**Plugin Interface:**
```typescript
interface FormatPlugin {
  readonly name: string;        // Unique identifier (e.g., 'markdown')
  readonly extension: string;   // File extension (e.g., 'md')
  readonly contentType: string; // MIME type
  generate(result: AnalysisResult, maxDepth: number | null): string;
}
```

**Plugin Registry (`src/plugin/registry.ts`):**
- `register(plugin)`: Register a new format plugin
- `get(name)`: Get plugin by name
- `has(name)`: Check if plugin is registered
- `getAvailableFormats()`: List all registered format names

**Shared Utilities (`src/plugin/shared/`):**
- `calculateImpactScore()`: Calculate impact based on breadth and depth
- `getImpactLevel()`: Convert score to impact level (critical/high/medium/low/none)
- `getImpactLabel()`: Get display label with emoji
- `buildTreeData()`: Build hierarchical tree for visualization
- `buildImpactedItems()`: Build list of impacted items with stats
- `collectEntryPoints()`: Collect entry points for testing

#### 6. `src/plugin/format-html/` - HTML Format Plugin

**Key Features:**
- **Modern Premium Design**: Black/green cyberpunk aesthetic with Inter + JetBrains Mono fonts
- **Function Grouping**: Automatically groups related functions from the same file with overlapping impact graphs
- **Interactive Tree View**: Collapsible hierarchy with shared reference detection and navigation
- **Interactive Graph View**: Radial SVG visualization with:
  - Zoom/pan controls
  - Fullscreen mode (F key shortcut)
  - Layer filtering
  - Convergence handling (curved edges for multiple incoming paths)
  - Node selection with connection highlighting
- **Entry Points Panel**: Shows test targets grouped by file with priority indicators

**Function Grouping Logic:**
Functions are grouped when they:
- Are in the same file AND
- Have caller/callee relationship OR share >70% overlap in dependents

This prevents duplicate visualizations when multiple functions in one file affect the same dependency graph.

#### 6. `src/plugin/index.ts` - Plugin Exports
Central export point for plugin system:
- Re-exports all plugin types
- Re-exports shared utilities
- Exports built-in plugin instances (`markdownFormatPlugin`, `htmlFormatPlugin`)

#### 7. `src/types.ts` - Type Definitions
Core interfaces for the application:
```typescript
interface CallSite { callerId: string; line: number; }
interface LazyImport { moduleSpecifier: string; line: number; }
interface FunctionInfo { 
  callers: CallSite[]; 
  definition: { startLine: number; endLine: number };
  lazyImports?: LazyImport[];
}
type CallGraph = Map<string, FunctionInfo>;
type OutputFormat = 'markdown' | 'html';
```

## Development Conventions

### Code Style

- **Strict TypeScript**: `strict: true` with `noUncheckedIndexedAccess: true`
- **Module System**: ES Modules (`"type": "module"`)
- **Import Style**: Use `.js` extensions for local imports

### Function Naming

- `get*`: Functions that retrieve data
- `build*`: Functions that construct data structures
- `find*`: Functions that search/filter data
- `generate*`: Functions that create formatted output
- `register*`: Functions that register plugins/components

### Error Handling

Errors are thrown as `Error` objects with descriptive messages. CLI catches and formats them.

### File ID Format

Functions identified as: `relative/path/to/file.ts:functionName`

## Adding a New Output Format

To add a new format (e.g., JSON):

1. **Create plugin directory:**
   ```
   src/plugin/format-json/
   └── index.ts
   ```

2. **Implement the plugin:**
   ```typescript
   import type { AnalysisResult } from '../../types.js';
   import type { FormatPlugin } from '../types.js';
   
   export class JsonFormatPlugin implements FormatPlugin {
     readonly name = 'json';
     readonly extension = 'json';
     readonly contentType = 'application/json';
     
     generate(result: AnalysisResult, maxDepth: number | null): string {
       return JSON.stringify(result, null, 2);
     }
   }
   
   export const jsonFormatPlugin = new JsonFormatPlugin();
   ```

3. **Register in `src/formatter.ts`:**
   ```typescript
   import { jsonFormatPlugin } from './plugin/format-json/index.js';
   registerPlugin(jsonFormatPlugin);
   ```

4. **Update type in `src/types.ts`** (if needed for CLI validation)

## Release Process

**Fully automated** - see [RELEASE.md](./RELEASE.md).

### Workflow

1. **Contributor**: Add changeset + PR → merge
2. **CI**: Auto-create "Version Packages" PR
3. **Maintainer**: Merge "Version Packages" PR
4. **CI**: Auto-publish to npm + create git tag

### Setup Required

- `NPM_TOKEN` secret in GitHub repository settings
- That's it! 🎉

## Dependencies

### Production
- `commander`: CLI argument parsing
- `typescript`: TypeScript compiler (bundled)

### Development
- `typescript`: TypeScript compiler
- `esbuild`: Bundler for CLI single-file output
- `@changesets/cli`: Version management
- `@types/node`: Node.js type definitions

## Common Tasks

### Adding a New CLI Option

1. Add option to CLI in `src/index.ts`
2. Pass to `runAnalysis()`
3. Use in analyzer or formatter as needed

### Adding a New Format Plugin

1. Create plugin in `src/plugin/format-<name>/`
2. Implement `FormatPlugin` interface
3. Register in `src/formatter.ts`
4. Update `OutputFormat` type in `src/types.ts`
5. Add tests and documentation

### Fixing a Bug

1. Identify issue in relevant source file
2. Fix in source code
3. Run `pnpm build`
4. Test manually with `pnpm depwalker`

---

*This document should be updated when project structure or conventions change.*
