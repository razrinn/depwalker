# Release Guide

## Release Workflow (Fully Automated)

This project uses **automated releases**. Once set up, publishing happens automatically when you merge the "Version Packages" PR.

### Prerequisites

- `NPM_TOKEN` secret configured in GitHub repository settings
  - Go to: Repository → Settings → Secrets and variables → Actions
  - Add `NPM_TOKEN` with your npm access token (classic or granular)

### How It Works

```
Contributor PR → Merge → CI creates "Version Packages" PR → Merge → Auto-publish + Tag
```

### Steps for Maintainers

1. **Review and merge contributor PRs** (with changesets)

2. **Wait for "Version Packages" PR** (created automatically by CI)

3. **Merge the "Version Packages" PR**
   - This bumps the version in `package.json`
   - Updates `CHANGELOG.md`
   - **Triggers automatic release:**
     - Publishes to npm
     - Creates git tag

4. **Done!** Check:
   - npm: https://www.npmjs.com/package/depwalker
   - GitHub releases/tags

## Adding a Changeset

Contributors must add a changeset with their changes:

```bash
pnpm changeset
```

Or manually create `.changeset/description.md`:

```yaml
---
"depwalker": patch
---

Description of changes
```

## Version Bump Types

- **patch**: Bug fixes (0.2.2 → 0.2.3)
- **minor**: New features (0.2.2 → 0.3.0)
- **major**: Breaking changes (0.2.2 → 1.0.0)

## Troubleshooting

### "No token found"

Make sure `NPM_TOKEN` is set in GitHub repository secrets.

### "Version already exists"

The version was already published. Check:
```bash
npm view depwalker versions
```

### Workflow not triggered

The release workflow only runs when the commit message contains `chore: version packages`.

## Manual Release (Fallback)

If automation fails, publish manually:

```bash
npm login
pnpm build
npm publish --access public
git tag -a vX.X.X -m "Release vX.X.X"
git push origin vX.X.X
```
