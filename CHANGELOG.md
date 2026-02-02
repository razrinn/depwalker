# depwalker

## 0.2.3

### Patch Changes

- ac62a52: Fix CLI not parsing arguments on macOS due to import.meta.url symlink mismatch

  The `import.meta.url === \`file://\${process.argv[1]}\``check fails on macOS
because`import.meta.url`resolves symlinks (e.g.,`/private/tmp`) while
`process.argv[1]`doesn't (e.g.,`/tmp`). This caused the CLI to silently exit
  without parsing arguments when installed from npm.

  Removed the check entirely and now call `cli.parse()` unconditionally, following
  the pattern used by Vite and other popular CLI tools.

## 0.2.2

### Patch Changes

- 089ad8d: Move TypeScript from devDependencies to dependencies to fix runtime module not found errors

## 0.2.1

### Patch Changes

- Move TypeScript from devDependencies to dependencies to fix runtime module not found error

## 0.2.0

### Minor Changes

- rewrite the project

## 0.1.3

### Patch Changes

- 1879555: add html output format

## 0.1.2

### Patch Changes

- f9bfed3: migrate cjs to esm, add support for node 18

## 0.1.1

### Patch Changes

- 5fd76e2: Implement changesets
