# Contributing to DepWalker

## Development Setup

```bash
git clone https://github.com/razrinn/depwalker.git
cd depwalker
pnpm install
```

## Development Commands

- `pnpm dev` - Watch mode for TypeScript compilation
- `pnpm build` - Build for production
- `pnpm depwalker` - Run the CLI locally

> **Note:** This project currently does not have automated tests. Please test your changes manually by running `pnpm depwalker` in a TypeScript project with uncommitted changes.

## Contribution Workflow

### 1. Make Changes

```bash
git checkout -b feature/my-feature
# Make your changes
```

### 2. Add a Changeset

**Required for all code changes:**

```bash
pnpm changeset
```

Select version bump:
- **patch**: Bug fixes (0.2.2 → 0.2.3)
- **minor**: New features (0.2.2 → 0.3.0)
- **major**: Breaking changes (0.2.2 → 1.0.0)

### 3. Submit PR

```bash
git add .
git commit -m "feat: your feature description"
git push origin feature/my-feature
```

Create PR to `main`. CI runs tests on Node.js 18, 20, 22.

---

## Release Process (Automated)

### For Maintainers

After merging contributor PRs:

1. **CI automatically creates** "Version Packages" PR
   - Bumps version in `package.json`
   - Updates `CHANGELOG.md`

2. **Review & merge** the "Version Packages" PR

3. **Auto-release triggers:**
   - Publishes to npm
   - Creates git tag
   - Done! ✅

See [RELEASE.md](RELEASE.md) for detailed setup and troubleshooting.

---

## Architecture Overview

DepWalker follows a pipeline architecture with 4 main stages:

```
Git Changes → AST Parsing → Call Graph Analysis → Plugin Rendering
```

### Core Modules

| Module | File | Responsibility |
|--------|------|----------------|
| **CLI** | `src/index.ts` | Argument parsing, orchestration, progress indicators |
| **Git** | `src/git.ts` | Run `git diff`, extract changed line ranges per file |
| **Analyzer** | `src/analyzer.ts` | TS Compiler API integration, AST traversal, call graph construction |
| **Formatter** | `src/formatter.ts` | Plugin registry, format routing |
| **Plugins** | `src/plugin/*` | Output format implementations (Markdown, HTML) |

### Call Graph Construction

The analyzer builds a call graph using TypeScript's AST:

```typescript
// Pseudocode of the core algorithm
function buildCallGraph(sourceFiles): CallGraph {
  const graph = new Map();
  
  for (const file of sourceFiles) {
    ts.forEachChild(file, function visit(node) {
      if (isFunctionDeclaration(node)) {
        const funcId = `${file}:${node.name}`;
        graph.set(funcId, { callers: [], definition: getLoc(node) });
      }
      // Track call expressions...
      ts.forEachChild(node, visit);
    });
  }
  
  return graph;
}
```

### Plugin System

Output formats are implemented as plugins implementing the `FormatPlugin` interface:

```typescript
interface FormatPlugin {
  readonly name: string;        // e.g., 'markdown'
  readonly extension: string;   // e.g., 'md'
  generate(result: AnalysisResult, maxDepth: number | null): string;
}
```

Plugins are auto-registered in `src/formatter.ts`.

## Project Structure

```
depwalker/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── git.ts                # Git diff parsing
│   ├── analyzer.ts           # TypeScript AST analysis
│   ├── formatter.ts          # Formatter entry point
│   ├── types.ts              # Type definitions
│   └── plugin/               # Format plugin system
│       ├── types.ts          # Plugin interfaces
│       ├── registry.ts       # Plugin registry
│       ├── index.ts          # Plugin exports
│       ├── shared/           # Shared utilities
│       │   ├── utils.ts      # Impact calculations
│       │   └── tree-builder.ts
│       ├── format-markdown/  # Markdown plugin
│       └── format-html/      # HTML plugin
├── dist/                     # Compiled output
├── .changeset/               # Changeset files
└── .github/workflows/        # CI/CD
```

---

## Adding a New Output Format

DepWalker uses a plugin-based architecture for output formats. To add a new format:

### 1. Create the Plugin

Create a new directory under `src/plugin/`:

```bash
mkdir src/plugin/format-json
```

### 2. Implement the Plugin

Create `src/plugin/format-json/index.ts`:

```typescript
import type { AnalysisResult } from '../../types.js';
import type { FormatPlugin } from '../types.js';
import { buildImpactedItems, calculateStats } from '../shared/utils.js';

export class JsonFormatPlugin implements FormatPlugin {
  readonly name = 'json';
  readonly extension = 'json';
  readonly contentType = 'application/json';

  generate(result: AnalysisResult, maxDepth: number | null): string {
    const impactedItems = buildImpactedItems(result.changedFunctions, result.callGraph);
    const stats = calculateStats(result.changedFiles, impactedItems);
    
    return JSON.stringify({
      stats,
      impactedItems,
      changedFiles: result.changedFiles,
    }, null, 2);
  }
}

export const jsonFormatPlugin = new JsonFormatPlugin();
```

### 3. Register the Plugin

Add to `src/formatter.ts`:

```typescript
import { jsonFormatPlugin } from './plugin/format-json/index.js';

// Register built-in plugins (around line 14)
registerPlugin(markdownFormatPlugin);
registerPlugin(htmlFormatPlugin);
registerPlugin(jsonFormatPlugin);  // Add this line
```

### 4. Update Type Definition

Add the new format to `OutputFormat` in `src/types.ts`:

```typescript
export type OutputFormat = 'markdown' | 'html' | 'json';
```

### 5. Build and Test

```bash
pnpm build
node dist/index.js --format json
```

---

## Troubleshooting

### Build Errors

**"Cannot find module" errors after build:**
- Make sure you ran `pnpm build` after making changes
- Check that imports use `.js` extensions for local files

**TypeScript compilation fails:**
- Ensure you're using Node.js 18+
- Run `rm -rf dist && pnpm build` for a clean build

### Runtime Errors

**"No changes detected" when there are uncommitted changes:**
- Make sure you're in a git repository
- Check `git status` — changes must be unstaged or staged (not committed)

**Analysis returns empty results:**
- Verify your `tsconfig.json` is valid and includes the changed files
- Check that the changed files are TypeScript (`.ts`, `.tsx`, `.js`, `.jsx`)

## Code Style Guidelines

- **Strict TypeScript**: Enable all strict options
- **ES Modules**: Use `import`/`export` with `.js` extensions
- **Function Naming**: 
  - `get*`: Retrieve data
  - `build*`: Construct data structures
  - `generate*`: Create formatted output
  - `register*`: Register plugins/components
