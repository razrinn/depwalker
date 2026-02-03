# depwalker

## 0.3.6

### Patch Changes

- 27c8380: fix oidc attempt

## 0.3.5

### Patch Changes

- 90bc317: debug release

## 0.3.4

### Patch Changes

- be6beea: fix oidc

## 0.3.3

### Patch Changes

- 5cf4ad0: remove node env

## 0.3.2

### Patch Changes

- 653f551: fix oidc by setting empty token

## 0.3.1

### Patch Changes

- 77b1a1c: fix oidc npm publish issue

## 0.3.0

### Minor Changes

- 6103d98: Improved impact classification system with depth-aware scoring

  ### New Features

  - **5-Level Impact Classification**: Added "Critical" level (20+) alongside existing High (10-19), Medium (4-9), Low (1-3), and None (0)
  - **Depth-Aware Scoring**: Impact score now considers both breadth (number of dependents) AND depth (call chain length)
  - **New Formula**: `Score = Dependents + (Depth × 3)` - depth weighted more as deeper chains indicate systemic risk

  ### Changes

  - Markdown reports now show impact score breakdown with dependents count and max chain depth
  - HTML reports updated with Critical filter button and new color scheme (critical=red, high=orange)
  - Increased view heights for better visibility (1600px fixed height, no viewport dependency)
  - Both Tree and Graph views display score information in headers

  ### Impact Levels

  | Level       | Score | Description                                         |
  | ----------- | ----- | --------------------------------------------------- |
  | 🔴 Critical | 20+   | Extreme impact - changes ripple through many levels |
  | 🟠 High     | 10-19 | Significant impact                                  |
  | 🟡 Medium   | 4-9   | Moderate impact                                     |
  | 🟢 Low      | 1-3   | Minimal impact                                      |
  | ⚪ None     | 0     | No external callers                                 |

## 0.2.4

### Patch Changes

- eddea69: Fix version constant in published package (was 0.2.2 instead of 0.2.3)

  The 0.2.3 release incorrectly had the version constant set to "0.2.2"
  due to a CI caching issue. This release corrects the version to 0.2.4.

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
