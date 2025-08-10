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

5. **After your PR is merged**, the GitHub Action will automatically:
   - Create a "Version Packages" PR with version bumps and changelog updates
   - When you merge that PR, it will automatically:
     - Publish to npm 📦
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
├── src/                 # Source code
├── dist/               # Built output (generated)
├── tests/              # Test files
├── .changeset/         # Changeset files
└── .github/workflows/  # CI/CD workflows
```

## Scripts Reference

- `pnpm dev` - Development with watch mode
- `pnpm build` - Build for production
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage
- `pnpm changeset` - Create a new changeset
- `pnpm version-packages` - Version packages (done automatically)
- `pnpm release` - Publish to npm (done automatically)
