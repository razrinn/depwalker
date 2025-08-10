# 🚶‍♂️ DepWalker

A comprehensive TypeScript-based dependency analysis tool that tracks the impact of code changes across your codebase. DepWalker analyzes your Git changes and shows you which functions and variables are affected, along with their dependency chains and usage patterns.

## 🎯 Use Cases

### Function & Component Analysis
- **Pre-commit Code Review**: See which parts of your codebase are affected by your changes before committing
- **Impact Analysis**: Understand the ripple effects of modifying a function or component
- **Test Planning**: Identify which components need testing after making changes
- **Refactoring Safety**: Verify the scope of impact when refactoring shared utilities or components
- **Code Review Assistance**: Help reviewers understand the full context of your changes
- **Breaking Change Detection**: Discover unexpected dependencies on functions you're modifying
- **React Component Changes**: Track which components are affected when updating shared hooks or context

### Variable & Configuration Analysis
- **Configuration Changes**: Track which functions are affected when modifying configuration variables, constants, or imports
- **Variable Usage Tracking**: See all read/write/reference patterns for changed variables across your codebase
- **Constant Impact Analysis**: Understand how changing constants or configuration objects affects dependent code
- **Import/Export Analysis**: Track the impact of changes to imported/exported variables and modules

### Advanced Analysis Features
- **Large Codebase Navigation**: Use depth limits to focus on immediate dependencies in complex projects
- **Circular Dependency Discovery**: Identify problematic circular references while analyzing impact
- **Multi-format Output**: Generate reports in tree, list, or JSON format for different use cases
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
depwalker --format tree    # Tree view format
depwalker --format list    # Flat list format (default)
depwalker --format json    # JSON output for programmatic use

# JSON output with file redirection (clean, no console messages)
depwalker --format json > analysis-report.json

# Compact mode for large codebases (reduces duplicate references)
depwalker --compact

# Limit total nodes to prevent overwhelming output
depwalker --max-nodes 50

# Disable file grouping (show each function separately)
depwalker --no-file-grouping

# Disable variable tracking (functions only)
depwalker --no-variables

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

### CI/CD Integration

DepWalker's JSON output mode is designed for automated workflows and CI/CD pipelines. The JSON format produces clean output without any console messages, making it perfect for file redirection and processing.

**Basic CI/CD Usage:**

```bash
# Generate analysis report
depwalker --format json > analysis-report.json

# Check if high-impact changes exist
HIGH_IMPACT=$(depwalker --format json | jq '.functions[] | select(.dependentCount > 5) | length')
if [ "$HIGH_IMPACT" -gt 0 ]; then
  echo "⚠️  High-impact changes detected. Consider additional testing."
fi

# Extract only changed function names
depwalker --format json | jq -r '.functions[].function'

# Get files with variable changes
depwalker --format json | jq -r '.variables[] | .file' | sort -u
```

**GitHub Actions Example:**

```yaml
name: Impact Analysis
on: [pull_request]
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Analyze Impact
        run: |
          npx depwalker --format json > impact.json
          echo "## 📊 Impact Analysis" >> $GITHUB_STEP_SUMMARY
          echo "\`\`\`json" >> $GITHUB_STEP_SUMMARY
          cat impact.json >> $GITHUB_STEP_SUMMARY
          echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
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

📦 Changed Variables and Their Usage:

📁 src/config/constants.ts:

  📦 API_BASE_URL (const) (line ~5)
    1. fetchData in src/utils/api.ts (line ~15) (2 reads)
    2. configureClient in src/services/http.ts (line ~8) (1 read)
    3. setupEnvironment in src/config/env.ts (line ~12) (1 read, 1 ref)
```

#### JSON Format

The JSON format produces clean output without any console messages, making it perfect for file redirection and programmatic use.

```bash
# Save analysis to file
depwalker --format json > analysis-report.json

# Pipe to other tools
depwalker --format json | jq '.functions[] | select(.dependentCount > 2)'
```

**Example JSON Output:**

```json
{
  "changedFiles": ["src/components/Button.tsx", "src/config/constants.ts"],
  "analysis": {
    "maxDepth": null,
    "timestamp": "2024-08-10T06:47:12.827Z",
    "totalChangedFunctions": 2,
    "totalChangedVariables": 1
  },
  "functions": [
    {
      "file": "src/components/Button.tsx",
      "function": "handleClick",
      "line": 23,
      "dependentCount": 4,
      "dependents": [
        { "file": "src/components/ButtonGroup.tsx", "function": "ButtonGroup" },
        { "file": "src/components/ButtonGroup.tsx", "function": "ActionButton" },
        { "file": "src/components/Toolbar.tsx", "function": "Toolbar" },
        { "file": "src/layouts/MainLayout.tsx", "function": "MainLayout" }
      ]
    }
  ],
  "variables": [
    {
      "file": "src/config/constants.ts",
      "variable": "API_BASE_URL",
      "line": 5,
      "type": "const",
      "scope": "module",
      "usageCount": 3,
      "usedBy": [
        {
          "function": "fetchData",
          "file": "src/utils/api.ts",
          "usages": [{ "line": 15, "type": "read" }]
        },
        {
          "function": "configureClient",
          "file": "src/services/http.ts",
          "usages": [{ "line": 8, "type": "read" }]
        }
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

3. **Build Dependency Graphs**: Using the TypeScript Compiler API, it builds two main graphs:

   **Function Call Graph:**
   - Parses all TypeScript files in your project
   - Identifies all function declarations and variable declarations that contain functions
   - Tracks all function calls and JSX component usage
   - Builds a complete call graph with line number information
   - Handles React patterns like `React.memo()` and dynamic imports
   - Tracks JSX component usage and dependencies

   **Variable Usage Graph:**
   - Identifies all variable declarations (const, let, var, imports, parameters)
   - Tracks variable usage patterns (read, write, reference)
   - Maps variable usage to specific functions and line numbers
   - Handles different variable scopes (global, module, function, block)
   - Tracks import/export relationships and their usage

4. **Impact Analysis**: For each changed item, it performs dual analysis:
   - **Function Impact**: Traverses the call graph to find all functions that depend on changed functions
   - **Variable Impact**: Identifies all functions that use changed variables and analyzes their dependencies

5. **Smart Output**: Presents results with intelligent formatting:
   - **Dual Analysis Display**: Shows both function and variable changes with their respective impacts
   - **File Grouping**: Groups multiple functions from the same file
   - **Usage Type Classification**: Distinguishes between read, write, and reference operations for variables
   - **Circular Reference Detection**: Identifies and handles circular dependencies
   - **Progress Indicators**: Shows real-time progress with spinners
   - **Impact Statistics**: Provides summary metrics for both functions and variables

## 🔧 Configuration

DepWalker uses your project's `tsconfig.json` file for TypeScript compilation settings. Make sure your `tsconfig.json` is properly configured for your project.

### Command Line Options

#### Core Options

- **`-d, --depth <number>`**: Maximum depth for dependency analysis. Useful for limiting the scope in large codebases.
- **`-t, --tsconfig <path>`**: Path to the TypeScript configuration file (default: `./tsconfig.json`).

#### Output Format Options

- **`-f, --format <type>`**: Output format - `list` (default), `tree`, or `json`
  - `list`: Flat list of dependencies (default)
  - `tree`: Hierarchical tree view
  - `json`: JSON output for programmatic use

#### Display Control Options

- **`-c, --compact`**: Enable compact mode - reduces duplicate references and limits callers per function. Useful for large codebases.
- **`--max-nodes <number>`**: Maximum total nodes to display in the entire tree. Prevents overwhelming output on very large dependency chains.
- **`--no-file-grouping`**: Disable grouping of multiple functions from the same file. Shows each function separately instead of grouping them.
- **`--no-variables`**: Disable variable change tracking and impact analysis. Focus only on function dependencies.

#### Examples

```bash
# Basic analysis with depth limit
depwalker --depth 5

# Compact analysis for large codebases
depwalker --compact --max-nodes 50

# JSON output for CI/CD integration (clean output, no console messages)
depwalker --format json --depth 3 > impact-analysis.json

# Analysis for specific scenarios
depwalker --format json --no-variables > functions-only.json

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
