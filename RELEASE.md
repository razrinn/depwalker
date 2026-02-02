# Release Guide

## Current Method: Local Publishing (Recommended)

Due to OIDC/trusted publishing limitations, we currently use **local publishing** which is the most reliable method.

### Prerequisites

- npm CLI 9.5.0+
- npm account with publish access to `depwalker`

### Steps

1. **Ensure you're on main branch with latest changes:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Check if version has changesets:**
   ```bash
   ls .changeset/*.md
   ```
   If changesets exist, the CI will create a "Version Packages" PR automatically.

3. **Wait for "Version Packages" PR to be created by CI**
   - Check https://github.com/razrinn/depwalker/pulls
   - Merge the PR when ready to release

4. **After merging the Version PR, publish locally:**
   ```bash
   # Build the package
   pnpm install
   pnpm build
   
   # Login to npm (if not already logged in)
   npm login
   
   # Publish
   npm publish --access public
   ```

5. **Create and push git tag:**
   ```bash
   git tag -a "v$(node -p "require('./package.json').version')" -m "Release v$(node -p "require('./package.json').version')"
   git push origin "v$(node -p "require('./package.json').version')"
   ```

## Automated Versioning (CI)

The CI workflow (`.github/workflows/ci-cd.yml`) automatically:

1. **Creates "Version Packages" PR** when changesets are detected on main branch
2. **Runs tests** on Node.js 18, 20, 22

You need to:
- Merge the "Version Packages" PR when ready to release
- Then publish locally (see above)

## Adding a Changeset

Before your changes can be released, add a changeset:

```bash
pnpm changeset
```

Or create manually:

```bash
cat > .changeset/my-change.md << 'EOF'
---
"depwalker": patch
---

Description of changes
EOF
```

Commit and push the changeset file with your PR.

## Version Bump Types

- **patch**: Bug fixes (0.2.1 → 0.2.2)
- **minor**: New features (0.2.2 → 0.3.0)
- **major**: Breaking changes (0.3.0 → 1.0.0)

## Troubleshooting

### "EUSAGE Automatic provenance generation not supported for provider: null"

You're trying to publish with `provenance: true` locally. This only works in CI.

**Fix:** The `provenance` field has been removed from `publishConfig`. Just run `npm publish --access public`.

### "Version already exists on npm"

Check npm: https://www.npmjs.com/package/depwalker

If the version exists, the Version PR already bumped the version. Just create the git tag:

```bash
git tag -a "v$(node -p "require('./package.json').version')" -m "Release v$(node -p "require('./package.json').version')"
git push origin "v$(node -p "require('./package.json').version')"
```

## Future: OIDC/Trusted Publishing (Experimental)

We attempted to implement OIDC/trusted publishing (see `.github/workflows/release.yml`) but encountered issues with npm's OIDC authentication. 

The workflow exists but is **not currently working**. Local publishing remains the recommended method per [OpenJS Foundation guidance](https://openjsf.org/blog/publishing-securely-on-npm).

To retry OIDC in the future:
1. Fix `.github/workflows/release.yml` to properly authenticate with npm via OIDC
2. Ensure Trusted Publisher is configured on npmjs.com: https://www.npmjs.com/package/depwalker/settings
3. Verify `repository.url` in package.json matches exactly (case-sensitive)
