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

## Project Structure

```
depwalker/
├── src/
│   ├── index.ts        # CLI entry point
│   ├── git.ts          # Git diff parsing
│   ├── analyzer.ts     # TypeScript AST analysis
│   ├── formatter.ts    # Markdown report generation
│   └── types.ts        # Type definitions
├── dist/               # Compiled output
├── .changeset/         # Changeset files
└── .github/workflows/  # CI/CD
```
