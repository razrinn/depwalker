# Contributing to depwalker

## Development Workflow

1. **Clone and setup**:

   ```bash
   git clone https://github.com/your-username/depwalker.git
   cd depwalker
   pnpm install
   ```

2. **Development**:

   ```bash
   pnpm dev          # Watch mode for TypeScript compilation
   pnpm test:watch   # Watch mode for tests
   ```

3. **Testing**:

   ```bash
   pnpm test         # Run all tests
   pnpm test:coverage # Run tests with coverage
   ```

4. **Building**:
   ```bash
   pnpm build        # Build for production
   ```

## Release Workflow 🚀

This project uses [Changesets](https://github.com/changesets/changesets) for automated version management and changelog generation.

### CI/CD Pipeline

We use a single comprehensive workflow that handles both testing and releasing:

#### **For Pull Requests:**

- ✅ Tests run on Node 20 & 22
- ✅ Coverage reporting
- ✅ Build verification
- ❌ **No release** (PRs only test)

#### **For Main Branch:**

- ✅ Tests & build (must pass first)
- ✅ Release process (only if tests pass)

### Creating a Release

1. **Make your changes** and commit them to a feature branch

2. **Add a changeset** describing your changes:

   ```bash
   pnpm changeset
   ```

   This will prompt you to:

   - Select the type of change (patch/minor/major)
   - Write a summary of the changes

   A changeset file will be created in `.changeset/` directory.

3. **Commit the changeset** along with your changes:

   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

4. **Create a PR** to main branch

   - PR will run tests automatically
   - **Require tests to pass** before merging

5. **After your PR is merged**, the CI/CD will automatically:
   - Run tests & build again
   - Create a "Version Packages" PR with version bumps and changelog updates
   - When you merge that PR, it will automatically:
     - Publish to npm 📦 (only if changesets exist)
     - Create a git tag (e.g., `v1.2.3`) 🏷️
     - Create a GitHub release 🚀

### Types of Changes

- **patch**: Bug fixes, small improvements (0.1.0 → 0.1.1)
- **minor**: New features, backwards compatible (0.1.0 → 0.2.0)
- **major**: Breaking changes (0.1.0 → 1.0.0)

### Manual Release (if needed)

If you need to release manually:

```bash
# Version all packages and update changelogs
pnpm version-packages

# Publish to npm (after building)
pnpm release
```

## Project Structure

```
depwalker/
├── src/
│   ├── index.ts        # Main CLI application
│   ├── analyzer.ts     # TypeScript analysis and dependency graph logic
│   └── ui.ts          # Output formatting and progress indicators
├── dist/               # Compiled JavaScript output (generated)
├── tests/              # Test files
├── .changeset/         # Changeset files
├── .github/workflows/  # CI/CD workflows
├── package.json        # Project metadata and dependencies
├── tsconfig.json       # TypeScript configuration
├── pnpm-lock.yaml      # Lock file for dependencies
├── LICENSE             # License file
├── CONTRIBUTING.md     # This file
└── README.md          # Main documentation
```

## 🧪 Testing

Comprehensive test suite with **Vitest** and 70% minimum coverage thresholds.

### Available Test Scripts

```bash
# Run tests
pnpm test
pnpm test:watch
pnpm test:coverage
pnpm test:ui
```

**Test Coverage:** 44 tests (37 unit + 7 integration) covering git parsing, UI components, and analysis pipeline.

## 🛠️ Development Scripts

### Available Scripts

- `pnpm dev` - Watch mode for development (recompiles on changes)
- `pnpm build` - Build the project for production
- `pnpm test` - Run tests with Vitest
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:ui` - Run tests with UI interface
- `pnpm changeset` - Create a new changeset
- `pnpm version-packages` - Version packages (done automatically)
- `pnpm release` - Publish to npm (done automatically)
