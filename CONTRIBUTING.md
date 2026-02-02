# Contributing to DepWalker

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
   ```

3. **Building**:
   ```bash
   pnpm build        # Build for production
   ```

## Release Workflow

This project uses [Changesets](https://github.com/changesets/changesets) for version management.

### Creating a Release

1. **Make your changes** and commit them to a feature branch

2. **Add a changeset**:

   ```bash
   pnpm changeset
   ```

3. **Commit the changeset** with your changes:

   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

4. **Create a PR** to main branch

5. **After merge**, CI/CD will:
   - Create a "Version Packages" PR
   - On merge, publish to npm and create git tag

### Types of Changes

- **patch**: Bug fixes (0.1.0 → 0.1.1)
- **minor**: New features (0.1.0 → 0.2.0)
- **major**: Breaking changes (0.1.0 → 1.0.0)

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
- `pnpm version-packages` - Version packages
- `pnpm release` - Publish to npm
