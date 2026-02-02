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
- **Code Review**: Share impact analysis as Markdown with your team or AI assistants

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

| Option                  | Description            | Default           |
| ----------------------- | ---------------------- | ----------------- |
| `-d, --depth <n>`       | Maximum analysis depth | No limit          |
| `-t, --tsconfig <path>` | TypeScript config path | `./tsconfig.json` |
| `-o, --output <file>`   | Save report to file    | Print to console  |

## 🤝 Contributing & Releasing

### For Contributors

1. **Fork & clone** the repository
2. **Create a branch**: `git checkout -b feature/my-feature`
3. **Make changes** and add a changeset:
   ```bash
   pnpm changeset
   # Select patch/minor/major and describe your changes
   ```
4. **Commit** your changes including the changeset file
5. **Push** and create a Pull Request to `main`

### For Maintainers (Releasing)

See [RELEASE.md](RELEASE.md) for detailed instructions.

**Quick Release Flow:**

1. **Merge contributor PRs** (changesets are included)
2. **CI automatically creates** "Version Packages" PR
3. **Review & merge** the "Version Packages" PR → version is bumped
4. **Publish locally:**
   ```bash
   git checkout main && git pull
   pnpm install
   pnpm build
   npm publish --access public
   ```
5. **Create git tag:**
   ```bash
   git tag -a "v$(node -p "require('./package.json').version')" -m "Release v$(node -p "require('./package.json').version')"
   git push origin "v$(node -p "require('./package.json').version')"
   ```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup details.

## 📄 License

ISC License - see [LICENSE](LICENSE)

---

Made with ❤️ by Ray Azrin Karim
