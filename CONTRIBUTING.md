# Contributing to DepWalker

## Development Setup

1. **Clone and setup**:

   ```bash
   git clone https://github.com/razrinn/depwalker.git
   cd depwalker
   pnpm install
   ```

2. **Development**:

   ```bash
   pnpm dev          # Watch mode for TypeScript compilation
   ```

3. **Building**:
   ```bash
   pnpm build        # Build for production
   ```

## Contribution Workflow

### 1. Make Changes

Create a feature branch and make your changes:

```bash
git checkout -b feature/my-feature
# Make your changes
```

### 2. Add a Changeset

Every PR that changes code should include a changeset:

```bash
pnpm changeset
```

Select the appropriate version bump:
- **patch**: Bug fixes (0.1.0 → 0.1.1)
- **minor**: New features (0.1.0 → 0.2.0)
- **major**: Breaking changes (0.1.0 → 1.0.0)

### 3. Commit & Push

```bash
git add .
git commit -m "feat: your feature description"
git push origin feature/my-feature
```

### 4. Create Pull Request

Create a PR to the `main` branch. The CI will run tests on Node.js 18, 20, and 22.

---

## Release Workflow (Maintainers Only)

After contributor PRs are merged:

### Step 1: Version Packages PR (Automated)

When changesets exist on `main`, CI automatically creates a **"Version Packages"** PR:
- Bumps version in `package.json`
- Updates `CHANGELOG.md`
- Consumes changeset files

**Action:** Review and merge this PR when ready to release.

### Step 2: Publish Locally

After merging the Version Packages PR:

```bash
# Get latest changes
git checkout main
git pull origin main

# Install and build
pnpm install
pnpm build

# Login to npm (if needed)
npm login

# Publish
npm publish --access public
```

### Step 3: Create Git Tag

```bash
# Create and push tag
git tag -a "v$(node -p "require('./package.json').version')" -m "Release v$(node -p "require('./package.json').version')"
git push origin "v$(node -p "require('./package.json').version')"
```

**Note:** We use local publishing for reliability. See [RELEASE.md](RELEASE.md) for details and troubleshooting.

---

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
├── .github/workflows/  # CI/CD
├── package.json
├── tsconfig.json
└── README.md
```

## Available Scripts

- `pnpm dev` - Watch mode for development
- `pnpm build` - Build for production
- `pnpm changeset` - Create a new changeset
- `pnpm version-packages` - Version packages (updates version from changesets)
- `pnpm depwalker` - Run the CLI locally
