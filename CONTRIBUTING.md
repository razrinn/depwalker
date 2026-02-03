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

// Register built-in plugins
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

## Code Style Guidelines

- **Strict TypeScript**: Enable all strict options
- **ES Modules**: Use `import`/`export` with `.js` extensions
- **Function Naming**: 
  - `get*`: Retrieve data
  - `build*`: Construct data structures
  - `generate*`: Create formatted output
  - `register*`: Register plugins/components
