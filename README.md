# 🚶‍♂️ DepWalker

A TypeScript-based dependency analysis tool that tracks the impact of code changes across your codebase. DepWalker analyzes your Git changes and shows you which functions are affected and their dependency chains.

## 🎯 Use Cases

- **Pre-commit Code Review**: See which parts of your codebase are affected by your changes before committing
- **Impact Analysis**: Understand the ripple effects of modifying a function or component
- **Test Planning**: Identify which components need testing after making changes
- **Refactoring Safety**: Verify the scope of impact when refactoring shared utilities or components
- **Code Review Assistance**: Help reviewers understand the full context of your changes
- **Breaking Change Detection**: Discover unexpected dependencies on functions you're modifying
- **React Component Changes**: Track which components are affected when updating shared hooks or context
- **Large Codebase Navigation**: Use depth limits to focus on immediate dependencies in complex projects
- **Circular Dependency Discovery**: Identify problematic circular references while analyzing impact
- **Documentation**: Generate dependency information for architecture documentation

## 📦 Installation

**Prerequisites:** Node.js (v16+) and Git

### Quick Start (Recommended)

Run directly without installation:

```bash
npx depwalker
# or with advanced options
npx depwalker --depth 3 --format tree --compact --tsconfig ./tsconfig.prod.json
```

### Project-level Installation

Install as a dev dependency in your project:

```bash
npm install --save-dev depwalker
# or
pnpm add -D depwalker
# or
yarn add -D depwalker

# Then run with npm scripts or npx
npx depwalker
```

### Global Installation

```bash
npm install -g depwalker
# Then run
depwalker
```

## 🚀 Usage

Run DepWalker in your TypeScript project directory with uncommitted changes:

### Basic Usage

```bash
# Basic usage
npx depwalker

# With depth limit (useful for large codebases)
depwalker --depth 3

# With custom tsconfig.json location
depwalker --tsconfig ./custom-tsconfig.json

# Combining options
depwalker --depth 2 --tsconfig ./build/tsconfig.prod.json
```

### Advanced Usage

```bash
# Different output formats
depwalker --format tree    # Default tree view
depwalker --format list    # Flat list format
depwalker --format json    # JSON output for programmatic use

# Compact mode for large codebases (reduces duplicate references)
depwalker --compact

# Limit total nodes to prevent overwhelming output
depwalker --max-nodes 50

# Disable file grouping (show each function separately)
depwalker --no-file-grouping

# Combine all advanced options
depwalker --depth 3 --format tree --compact --max-nodes 100 --tsconfig ./tsconfig.json
```

### Pre-commit Integration

Add DepWalker to your pre-commit workflow to analyze impact before committing:

**Option 1: Git Hook**

Create `.git/hooks/pre-commit`:

```bash
#!/bin/sh
echo "🔍 Analyzing dependency impact..."
npx depwalker --depth 3 --tsconfig ./tsconfig.json
echo "\n✅ Review the impact above before proceeding with commit."
read -p "Continue with commit? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Commit cancelled."
    exit 1
fi
```

**Option 2: Package.json Script**

Add to your `package.json`:

```json
{
  "scripts": {
    "pre-commit": "depwalker --depth 3 --tsconfig ./tsconfig.json",
    "commit-check": "npm run pre-commit && echo 'Ready to commit!'"
  }
}
```

Then run before committing:

```bash
npm run commit-check
```

### Example Output

#### Tree Format (Default)

```
🚀 DepWalker - TypeScript Dependency Analysis

✓ Git diff fetched successfully
✓ Parsed git diff - found 2 changed TypeScript files
✓ Created TypeScript program - analyzing 847 source files
✓ Built call graph - discovered 1,204 functions
✓ Analysis complete - 3 changed functions identified

🔍 Changed files: .../components/Button.tsx, .../utils/helpers.ts

---
Detected changes in these functions:
  In src/components/Button.tsx:
    - handleClick
    - validateInput
  In src/utils/helpers.ts:
    - formatDate

💥 Dependency Walker Analysis 💥
[Compact mode, Max depth 3, File grouping]

📁 Changes in: src/components/Button.tsx
==================================================

🎯 Change Source: handleClick (line ~23)
--------------------------------------------------
    ├── ButtonGroup, ActionButton in src/components/ButtonGroup.tsx (lines ~45, 67)
    │   └── Toolbar in src/components/Toolbar.tsx (line ~12)
    │       └── MainLayout in src/layouts/MainLayout.tsx (line ~78)
    └── ActionPanel in src/components/ActionPanel.tsx (line ~34)
        └── (Reference to Toolbar - 3 callers)

🎯 Change Source: validateInput (line ~15)
--------------------------------------------------
    └── No external callers found in the project.

📊 Impact Summary:

• Changed files: 2
• Changed functions: 3

📈 Impact Distribution:
• High impact (6+ dependents): 0
• Medium impact (3-5 dependents): 1
• Low impact (1-2 dependents): 1
• No impact (0 dependents): 1

🎯 Top Impacted Functions:
  1. handleClick in .../components/Button.tsx (4 dependents)
  2. formatDate in .../utils/helpers.ts (2 dependents)
  3. validateInput in .../components/Button.tsx (0 dependents)
```

#### List Format

```bash
# depwalker --format list
📋 Changed Functions and Their Dependencies:

📁 src/components/Button.tsx:

  🔸 handleClick (line ~23)
    1. ButtonGroup in .../components/ButtonGroup.tsx
    2. ActionButton in .../components/ButtonGroup.tsx
    3. Toolbar in .../components/Toolbar.tsx
    4. MainLayout in .../layouts/MainLayout.tsx
    5. ActionPanel in .../components/ActionPanel.tsx

  🔸 validateInput (line ~15)
    • No dependencies found
```

#### JSON Format

```bash
# depwalker --format json
{
  "changedFiles": ["src/components/Button.tsx", "src/utils/helpers.ts"],
  "analysis": {
    "maxDepth": null,
    "timestamp": "2024-08-09T19:47:14.235Z",
    "totalChangedFunctions": 3
  },
  "changes": [
    {
      "file": "src/components/Button.tsx",
      "function": "handleClick",
      "line": 23,
      "dependentCount": 4,
      "dependents": [
        { "file": "src/components/ButtonGroup.tsx", "function": "ButtonGroup" },
        { "file": "src/components/ButtonGroup.tsx", "function": "ActionButton" },
        { "file": "src/components/Toolbar.tsx", "function": "Toolbar" },
        { "file": "src/layouts/MainLayout.tsx", "function": "MainLayout" },
        { "file": "src/components/ActionPanel.tsx", "function": "ActionPanel" }
      ]
    }
  ]
}
```

## 🛠️ Development

### Available Scripts

- `pnpm dev` - Watch mode for development (recompiles on changes)
- `pnpm build` - Build the project for production
- `pnpm test` - Run tests (currently not implemented)

### Project Structure

```
depwalker/
├── src/
│   ├── index.ts        # Main CLI application
│   ├── analyzer.ts     # TypeScript analysis and dependency graph logic
│   └── ui.ts          # Output formatting and progress indicators
├── dist/               # Compiled JavaScript output (generated)
├── package.json        # Project metadata and dependencies
├── tsconfig.json       # TypeScript configuration
├── pnpm-lock.yaml      # Lock file for dependencies
└── README.md          # This file
```

## 🏗️ How It Works

1. **Git Diff Analysis**: DepWalker starts by running `git diff -U0 HEAD` to get all uncommitted changes in your repository.

2. **Parse Changed Lines**: It parses the diff output to identify which TypeScript files have changes and exactly which lines were modified.

3. **Build Dependency Graph**: Using the TypeScript Compiler API, it:

   - Parses all TypeScript files in your project
   - Identifies all function declarations and variable declarations that contain functions
   - Tracks all function calls and JSX component usage
   - Builds a complete call graph with line number information
   - Handles React patterns like `React.memo()` and dynamic imports
   - Tracks JSX component usage and dependencies

4. **Impact Analysis**: For each changed function, it traverses the dependency graph to find all functions that directly or indirectly depend on it.

5. **Smart Output**: Presents results with intelligent formatting:
   - **File Grouping**: Groups multiple functions from the same file
   - **Circular Reference Detection**: Identifies and handles circular dependencies
   - **Progress Indicators**: Shows real-time progress with spinners
   - **Impact Statistics**: Provides summary metrics and top impacted functions

## 🔧 Configuration

DepWalker uses your project's `tsconfig.json` file for TypeScript compilation settings. Make sure your `tsconfig.json` is properly configured for your project.

### Command Line Options

#### Core Options

- **`-d, --depth <number>`**: Maximum depth for dependency analysis. Useful for limiting the scope in large codebases.
- **`-t, --tsconfig <path>`**: Path to the TypeScript configuration file (default: `./tsconfig.json`).

#### Output Format Options

- **`-f, --format <type>`**: Output format - `tree` (default), `list`, or `json`
  - `tree`: Hierarchical tree view (default)
  - `list`: Flat list of dependencies
  - `json`: JSON output for programmatic use

#### Display Control Options

- **`-c, --compact`**: Enable compact mode - reduces duplicate references and limits callers per function. Useful for large codebases.
- **`--max-nodes <number>`**: Maximum total nodes to display in the entire tree. Prevents overwhelming output on very large dependency chains.
- **`--no-file-grouping`**: Disable grouping of multiple functions from the same file. Shows each function separately instead of grouping them.

#### Examples

```bash
# Basic analysis with depth limit
depwalker --depth 5

# Compact analysis for large codebases
depwalker --compact --max-nodes 50

# JSON output for CI/CD integration
depwalker --format json --depth 3 > impact-analysis.json

# Detailed analysis with custom config
depwalker --format tree --tsconfig ./custom-tsconfig.json --no-file-grouping

# Conservative analysis for huge codebases
depwalker --compact --depth 2 --max-nodes 25 --format list
```

### Custom TypeScript Configuration

The `--tsconfig` option is particularly useful in these scenarios:

- **Multiple tsconfig files**: Use production, development, or test-specific configurations
- **Monorepo setup**: Point to specific package configurations
- **Custom build directories**: When your tsconfig is in a different location
- **CI/CD environments**: Use optimized configurations for analysis

```bash
# Use production configuration
depwalker --tsconfig ./tsconfig.prod.json

# Point to a different directory
depwalker --tsconfig ../config/tsconfig.analysis.json

# Monorepo package-specific analysis
depwalker --tsconfig ./packages/core/tsconfig.json
```

### TypeScript Config Requirements

Your `tsconfig.json` should include:

- Proper `include` and `exclude` paths
- Module resolution settings
- Target and lib configurations
- Correct `baseUrl` and `paths` for module resolution

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Build and test your changes
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

```
ISC License

Copyright (c) 2024 Ray Azrin Karim

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## 👤 Author

Ray Azrin Karim

## 🙏 Acknowledgments

- Built with TypeScript Compiler API
- Inspired by the need for better impact analysis in large codebases

---

Made with ❤️ by Ray Azrin Karim
