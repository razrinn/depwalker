# 🚶‍♂️ DepWalker

[![npm version](https://badge.fury.io/js/depwalker.svg)](https://www.npmjs.com/package/depwalker)
[![npm downloads](https://img.shields.io/npm/dm/depwalker.svg)](https://www.npmjs.com/package/depwalker)
[![Pipeline](https://github.com/razrinn/depwalker/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/razrinn/depwalker/actions/workflows/ci-cd.yml)

A TypeScript dependency analysis tool that tracks the impact of code changes. DepWalker analyzes Git changes and shows which functions are affected, along with their dependency chains.

## 🎯 Use Cases

- **Impact Analysis**: Understand which functions are affected by your changes
- **Pre-commit Review**: See the scope of impact before committing changes
- **Test Planning**: Identify which parts need testing after modifications
- **Refactoring Safety**: Verify dependencies when refactoring shared code
- **Code Review**: Share impact analysis as Markdown or interactive HTML with your team

## 📦 Installation

**Prerequisites:** Node.js (v18+) and Git

### Quick Start (Recommended)

```bash
npx depwalker
```

### Project Installation

```bash
npm install --save-dev depwalker
# or
pnpm add -D depwalker
```

## 🚀 Usage

Run DepWalker in your TypeScript project with uncommitted changes:

```bash
# Basic usage - outputs Markdown report
npx depwalker

# Interactive HTML visualization (auto-opens browser)
npx depwalker --format html

# HTML with custom output path (auto-opens browser)
npx depwalker --format html --output impact-report.html

# HTML without auto-opening browser
npx depwalker --format html --no-open

# Limit analysis depth
npx depwalker --depth 3

# Custom tsconfig location
npx depwalker --tsconfig ./custom-tsconfig.json

# Save to file
npx depwalker --output impact-report.md
```

### Example Output

```markdown
# Dependency Impact Analysis

## Summary

| Metric                      | Value |
| --------------------------- | ----- |
| Changed Files               | 2     |
| Changed Functions           | 5     |
| High Impact (6+ dependents) | 1     |
| Medium Impact (3-5)         | 2     |

## Changed Files

- `src/utils/helpers.ts`
- `src/components/Button.tsx`

## Most Impacted Changes

| Function        | File                        | Dependents |
| --------------- | --------------------------- | ---------- |
| **handleClick** | `src/components/Button.tsx` | 8          |
| **formatDate**  | `src/utils/helpers.ts`      | 4          |

## Detailed Impact

### src/components/Button.tsx

#### `handleClick`

- **Location**: `src/components/Button.tsx:23`
- **Dependents**: 8
- **Impact**: 🔴 High

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
- **html**: Interactive web visualization with Tree view (collapsible hierarchy) and Graph view (node diagram), plus search and filters - best for exploring complex dependency graphs. **Automatically opens in browser** (use `--no-open` to disable).

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
