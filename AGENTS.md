# DepWalker - Agent Documentation

> **For AI Coding Agents:** Essential context for working with the DepWalker codebase.

## Project Overview

DepWalker is a TypeScript dependency analysis CLI tool that tracks the impact of code changes across a codebase. It analyzes Git changes and shows which functions are affected, along with their dependency chains.

### Key Features

- **Function Impact Analysis**: Traces function call chains from changed functions
- **Git Integration**: Automatically detects uncommitted changes via `git diff`
- **TypeScript Compiler API**: Uses native TS compiler for accurate AST analysis
- **Markdown Output**: Clean, structured reports perfect for humans and LLMs

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
│   ├── formatter.ts         # Markdown report generation
│   └── types.ts             # TypeScript interfaces
├── scripts/                  # Build scripts
│   └── build.js             # esbuild bundler with version injection
├── dist/                     # Compiled & bundled output
├── .changeset/               # Changeset files for versioning
├── .github/workflows/        # CI/CD pipelines
├── package.json
├── tsconfig.json
└── AGENTS.md                # This file
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
- `--output <file>`: Save report to file

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

#### 4. `src/formatter.ts` - Output Generation
- `generateMarkdownReport()`: Creates Markdown report
- `buildImpactTree()`: Builds hierarchical dependency tree

#### 5. `src/types.ts` - Type Definitions
Core interfaces for the application.

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

### Error Handling

Errors are thrown as `Error` objects with descriptive messages. CLI catches and formats them.

### File ID Format

Functions identified as: `relative/path/to/file.ts:functionName`

## Release Process

See [RELEASE.md](./RELEASE.md) for detailed instructions.

### Quick Summary

1. **Make changes** → commit to feature branch
2. **Add changeset**: `pnpm changeset` (select patch/minor/major)
3. **Commit changeset** with changes
4. **Create PR** → main branch
5. **Merge PR** → CI creates "Version Packages" PR
6. **Merge "Version Packages" PR** → version is bumped
7. **Publish locally**: `pnpm build && npm publish --access public`
8. **Create git tag**: `git tag -a vX.X.X -m "Release vX.X.X" && git push origin vX.X.X`

**Note**: We currently use local publishing. CI-based OIDC publishing is experimental (see RELEASE.md).

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

### Fixing a Bug

1. Identify issue in relevant source file
2. Fix in source code
3. Run `pnpm build`
4. Test manually with `pnpm depwalker`

---

*This document should be updated when project structure or conventions change.*
