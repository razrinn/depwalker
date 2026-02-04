# 🚶‍♂️ DepWalker

[![npm version](https://badge.fury.io/js/depwalker.svg)](https://badge.fury.io/js/depwalker)
[![npm downloads](https://img.shields.io/npm/dm/depwalker.svg)](https://www.npmjs.com/package/depwalker)
[![Pipeline](https://github.com/razrinn/depwalker/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/razrinn/depwalker/actions/workflows/ci-cd.yml)
[![npm version](https://badge.fury.io/js/depwalker.svg)](https://www.npmjs.com/package/depwalker)
[![npm downloads](https://img.shields.io/npm/dm/depwalker.svg)](https://www.npmjs.com/package/depwalker)
[![Node.js Version](https://img.shields.io/node/v/depwalker)](https://nodejs.org/)
[![License](https://img.shields.io/npm/l/depwalker)](https://github.com/razrinn/depwalker/blob/main/LICENSE)
[![Pipeline](https://github.com/razrinn/depwalker/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/razrinn/depwalker/actions/workflows/ci-cd.yml)

A TypeScript dependency analysis tool that tracks the impact of code changes. DepWalker analyzes Git changes and shows which functions are affected, along with their dependency chains.

## 🎯 Use Cases

- **Impact Analysis**: Understand which functions are affected by your changes
- **Pre-commit Review**: See the scope of impact before committing changes
- **Test Planning**: Identify which parts need testing after modifications
- **Refactoring Safety**: Verify dependencies when refactoring shared code
- **Code Review**: Share impact analysis as Markdown or interactive HTML with your team

## 🧠 How It Works

DepWalker analyzes your TypeScript codebase in 4 steps:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  1. Detect  │ →  │  2. Parse   │ →  │  3. Analyze │ →  │  4. Report  │
│   Changes   │    │    Code     │    │ Dependencies│    │   Results   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

1. **Detect Changes** — Runs `git diff` to find files and line numbers you've modified
2. **Parse Code** — Uses the TypeScript Compiler API to build an AST of your entire codebase
3. **Analyze Dependencies** — Maps function calls to build a complete call graph, then traces which functions are affected by your changes
4. **Generate Report** — Renders the impact analysis as Markdown or interactive HTML

## 📦 Installation

**Prerequisites:** Node.js (v18+) and Git

### Quick Start (Recommended)

Run without installing using your preferred package runner:

```bash
# npm
npx depwalker@latest

# pnpm
pnpm dlx depwalker@latest

# bun
bunx depwalker@latest
```

## 🚀 Usage

Run DepWalker in your TypeScript project with uncommitted changes:

```bash
# Basic usage - outputs Markdown report
npx depwalker@latest

# Interactive HTML visualization (auto-opens browser)
npx depwalker@latest --format html

# Using bunx instead of npx
bunx depwalker@latest --format html

# HTML with custom output path (auto-opens browser)
npx depwalker@latest --format html --output impact-report.html

# HTML without auto-opening browser
npx depwalker@latest --format html --no-open

# Limit analysis depth
npx depwalker@latest --depth 3

# Custom tsconfig location
npx depwalker@latest --tsconfig ./custom-tsconfig.json

# Save to file
npx depwalker@latest --output impact-report.md
```

### Example Output

```markdown
# Dependency Impact Analysis

## Summary

| Metric                      | Value |
| --------------------------- | ----- |
| Changed Files               | 2     |
| Changed Functions           | 5     |
| 🔴 Critical Impact (20+)    | 0     |
| 🟠 High Impact (10-19)      | 1     |
| 🟡 Medium Impact (4-9)      | 2     |
| 🟢 Low Impact (1-3)         | 1     |
| ⚪ No Impact                | 1     |

## Changed Files

- `src/utils/helpers.ts`
- `src/components/Button.tsx`

## Most Impacted Changes

| Function        | File                        | Score | Dependents | Depth |
| --------------- | --------------------------- | ----- | ---------- | ----- |
| **handleClick** | `src/components/Button.tsx` | 🟠 12 | 8          | 2     |
| **formatDate**  | `src/utils/helpers.ts`      | 🟡 6  | 4          | 1     |

## Detailed Impact

### src/components/Button.tsx

#### `handleClick`

- **Location**: `src/components/Button.tsx:23`
- **Impact Score**: 12 (8 dependents × depth factor)
- **Max Chain Depth**: 2 levels
- **Impact**: 🟠 High

**Impact Chain:**

- **SubmitForm** (`src/forms/SubmitForm.tsx:45`)
  - **ModalDialog** (`src/dialogs/ModalDialog.tsx:12`)
```

## 🔧 Options

| Option                   | Description                             | Default           |
| ------------------------ | --------------------------------------- | ----------------- |
| `-f, --format <format>`  | Output format: `markdown`, `html`       | `markdown`        |
| `-d, --depth <n>`        | Maximum analysis depth                  | No limit          |
| `-t, --tsconfig <path>`  | TypeScript config path                  | `./tsconfig.json` |
| `-o, --output <file>`    | Save report to file                     | Auto-generated    |
| `--no-open`              | Don't auto-open HTML report in browser  | (auto-opens)      |

### Output Formats

- **markdown** (default): Clean, structured report perfect for sharing with AI assistants or documentation
- **html**: Interactive web visualization with:
  - **Tree View**: Collapsible hierarchy with shared reference detection
  - **Graph View**: Radial node diagram with zoom/pan, fullscreen mode, and layer filtering
  - **Function Grouping**: Automatically groups related functions from the same file
  - **Entry Points**: Shows test targets with priority indicators
  - **Search and Filters**: Find functions by name or filter by impact level
  
  Best for exploring complex dependency graphs. **Automatically opens in browser** (use `--no-open` to disable).

### Limitations

- **TypeScript only** — Requires valid TypeScript (or JavaScript with `@ts-check`)
- **Static analysis** — Cannot trace dynamic calls (e.g., `const fn = 'foo'; eval(fn)()`)
- **Template literal imports** — Dynamic imports with template strings (`import(\`./${x}\`)`) are not resolved
- **Git dependency** — Requires a git repository with uncommitted changes to analyze
- **Single project** — Does not analyze cross-package dependencies in monorepos

### Impact Scoring

Impact Score = Dependents + (Depth × 3)

| Level       | Score | Description                                         |
| ----------- | ----- | --------------------------------------------------- |
| 🔴 Critical | 20+   | Extreme impact - changes ripple through many levels |
| 🟠 High     | 10-19 | Significant impact                                  |
| 🟡 Medium   | 4-9   | Moderate impact                                     |
| 🟢 Low      | 1-3   | Minimal impact                                      |
| ⚪ None     | 0     | No external callers                                 |

## 🔌 Plugin Architecture

DepWalker uses a plugin-based architecture for output formats. Want to add JSON, CSV, or your own custom format? See [CONTRIBUTING.md](CONTRIBUTING.md) for a step-by-step guide to creating plugins.

## 🤝 Contributing

### Quick Start for Contributors

```bash
git clone https://github.com/razrinn/depwalker.git
cd depwalker && pnpm install
git checkout -b feature/my-feature
# Make changes
pnpm changeset  # Add changeset
pnpm build      # Test build
git commit -m "feat: description"
git push origin feature/my-feature
# Create PR
```

### Release Process (Fully Automated)

| Step | Who | Action |
|------|-----|--------|
| 1 | Contributor | Add changeset + PR |
| 2 | Maintainer | Merge PR |
| 3 | CI | Create "Version Packages" PR |
| 4 | Maintainer | Merge "Version Packages" PR |
| 5 | CI | **Auto-publish to npm + create tag** ✅ |

See [CONTRIBUTING.md](CONTRIBUTING.md) and [RELEASE.md](RELEASE.md) for details.

## 📄 License

ISC License - see [LICENSE](LICENSE)

---

Made with ❤️ by Ray Azrin Karim
