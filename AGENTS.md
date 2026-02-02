# DepWalker - Agent Documentation

> **For AI Coding Agents:** This document provides essential context for working with the DepWalker codebase.

## Project Overview

DepWalker is a comprehensive TypeScript dependency analysis CLI tool that tracks the impact of code changes across a codebase. It analyzes Git changes and shows which functions and variables are affected, along with their dependency chains and usage patterns.

### Key Features

- **Function Impact Analysis**: Traces function call chains from changed functions
- **Variable Usage Tracking**: Analyzes variable read/write usage patterns
- **Multiple Output Formats**: Tree, list, JSON (for CI/CD), and interactive HTML
- **Git Integration**: Automatically detects uncommitted changes via `git diff`
- **TypeScript Compiler API**: Uses native TS compiler for accurate AST analysis

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript 5.9+ |
| Runtime | Node.js 18+ |
| Package Manager | pnpm 10.11.0 |
| Build Tool | TypeScript Compiler (tsc) + esbuild |
| Bundler | esbuild (for CLI bundling) |
| CLI Framework | Commander.js |
| Release Management | Changesets |

## Project Structure

```
depwalker/
├── src/                      # Source code
│   ├── index.ts             # CLI entry point (Commander.js setup)
│   ├── analyzer.ts          # Core analysis logic (Git parsing, AST analysis)
│   └── ui.ts                # Output formatting, spinners, HTML generation
├── scripts/                  # Build scripts
│   └── build.js             # esbuild bundler script with version injection
├── dist/                     # Compiled & bundled JavaScript output (gitignored)
├── .changeset/               # Changeset files for versioning
├── .github/workflows/        # CI/CD pipelines
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── AGENTS.md                # This file
```

## Build Process

The project uses a two-stage build process:

1. **TypeScript Compilation**: `tsc` compiles `.ts` files to `.js` in `dist/`
2. **Bundling**: `esbuild` bundles all modules into a single `dist/index.js` file

### Why Bundle?

- **Symlink compatibility**: Bundled file works when run through `node_modules/.bin/` symlinks
- **No relative import issues**: All code in one file eliminates ESM relative import problems
- **Version injection**: Build script reads version from `package.json` and injects it via esbuild's `define`

### Build Script (`scripts/build.js`)

```javascript
// Reads version from package.json
const pkg = JSON.parse(readFileSync('package.json'));

// Injects version at build time
esbuild({
  define: {
    'process.env.PKG_VERSION': JSON.stringify(pkg.version),
  },
});
```

### Source Code Pattern

```typescript
// src/index.ts - uses placeholder
const VERSION = process.env.PKG_VERSION || '0.0.0';

// dist/index.js - after build, version is inlined
const VERSION = "0.1.3";
```

## Build and Development Commands

```bash
# Install dependencies
pnpm install

# Development (watch mode)
pnpm dev                    # tsc -w

# Build for production
pnpm build                  # rm -rf dist && tsc

# Run CLI locally
pnpm depwalker             # node dist/index.js

# Release management
pnpm changeset             # Create new changeset
pnpm version-packages      # Version packages
pnpm release               # Build and publish to npm
```

## Code Architecture

### Module Breakdown

#### 1. `src/index.ts` - CLI Entry Point
- Sets up Commander.js CLI with all command-line options
- Orchestrates the analysis pipeline with progress indicators
- Handles output file writing and format routing
- Exports `performAnalysis()` for programmatic use

**Key Options:**
- `--depth <number>`: Maximum analysis depth
- `--tsconfig <path>`: Custom tsconfig path
- `--format <type>`: Output format (tree/list/json/html)
- `--compact`: Reduce duplicate references
- `--max-nodes <number>`: Limit total output nodes
- `--no-file-grouping`: Disable file-based grouping
- `--no-variables`: Skip variable tracking
- `--output <file>`: Save output to file

#### 2. `src/analyzer.ts` - Core Analysis Engine
This is the heart of the application (~1000 lines).

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `getGitDiff()` | Executes `git diff -U0 HEAD` to get uncommitted changes |
| `parseGitDiff()` | Parses git diff output to extract changed line numbers |
| `createTsProgram()` | Creates TypeScript compiler program from tsconfig |
| `buildCallGraph()` | Builds function call graph using TypeScript AST |
| `buildVariableGraph()` | Builds variable usage graph with read/write tracking |
| `findChangedFunctions()` | Identifies functions within changed line ranges |
| `findChangedVariables()` | Identifies variables within changed line ranges |
| `generateImpactTree()` | Recursively generates dependency tree output |

**Key Data Structures:**
```typescript
// Function call tracking
interface FunctionInfo {
  callers: CallSite[];           // Who calls this function
  definition: { startLine, endLine };
}
type CallGraph = Map<string, FunctionInfo>;  // "filepath:funcName" -> info

// Variable usage tracking
interface VariableInfo {
  usages: VariableUsage[];       // Where/how variable is used
  definition: { startLine, endLine };
  type: 'const' | 'let' | 'var' | 'import' | 'export' | 'parameter';
  scope: 'global' | 'module' | 'function' | 'block';
}
type VariableGraph = Map<string, VariableInfo>;
```

#### 3. `src/ui.ts` - Output Formatting
Handles all output formatting (~1800 lines).

**Components:**
- `Spinner`: CLI progress indicator with braille patterns
- `printTreeFormat()`: Hierarchical tree output with colors
- `printListFormat()`: Flat list output
- `printJsonFormat()`: JSON for CI/CD pipelines
- `printHtmlFormat()`: Interactive HTML with vis.js graph

**Color Scheme:**
- Yellow: Changed functions/sources
- Cyan: File paths
- Magenta: Section headers
- Green: Success indicators
- Dim: Metadata (line numbers, hints)

## Development Conventions

### Code Style

- **Strict TypeScript**: `strict: true` with additional flags:
  - `noUncheckedIndexedAccess: true`
  - `exactOptionalPropertyTypes: true`
  - `isolatedModules: true`
  
- **Module System**: ES Modules (`"type": "module"`)
- **Import Style**: Use `.js` extensions for local imports

### Function Naming

- `get*`: Functions that retrieve data (may have side effects like `execSync`)
- `build*`: Functions that construct complex data structures
- `find*`: Functions that search/filter data
- `generate*`: Functions that create formatted output
- `print*`: Functions that output to console

### Error Handling

Errors are thrown as `Error` objects with descriptive messages. CLI catches errors and formats them appropriately based on output format:

```typescript
// JSON format errors
{ error: { message: string, timestamp: string } }

// HTML format errors
// Generates error HTML page
```

### File ID Format

Functions and variables are identified with the format:
```
relative/path/to/file.ts:functionName
```

## Release Process

1. **Make changes** and commit to feature branch
2. **Add changeset**: `pnpm changeset` (select patch/minor/major)
3. **Commit changeset** along with changes
4. **Create PR** to main branch
5. **Merge PR** - CI runs build
6. **Version Packages PR** - Automatically created by Changesets
7. **Merge Version PR** - Triggers npm publish and GitHub release

## Security Considerations

- Git commands use `execSync` - only runs `git diff -U0 HEAD`
- File system access limited to reading tsconfig and source files
- No network requests in core logic (except HTML format loads vis.js from CDN)
- Output file writing uses resolved paths

## Common Tasks

### Adding a New Output Format

1. Add format option to CLI in `src/index.ts`
2. Add `print*Format()` function in `src/ui.ts`
3. Update `printAnalysisResults()` to route to new format

### Adding a New Analysis Feature

1. Add core logic to `src/analyzer.ts`
2. Export any new functions/types
3. Update `AnalysisResult` interface if needed
4. Integrate into `performAnalysis()` in `src/index.ts`
5. Update output formatters in `src/ui.ts`

### Fixing a Bug

1. Identify the issue in the relevant source file
2. Fix in source code
3. Run full build: `pnpm build`
4. Test manually with `pnpm depwalker`

## Dependencies

### Production
- `commander`: CLI argument parsing

### Development
- `typescript`: TypeScript compiler
- `esbuild`: Bundler for CLI single-file output
- `@changesets/cli`: Version management
- `@types/node`: Node.js type definitions

## External Tools Integration

- **Git**: Requires Git repository, uses `git diff -U0 HEAD`
- **TypeScript**: Requires `tsconfig.json` in project
- **vis.js**: Loaded from CDN for HTML output format only

---

*This document should be updated when the project structure or conventions change.*
