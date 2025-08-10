# 🚶‍♂️ DepWalker

[![npm version](https://badge.fury.io/js/depwalker.svg)](https://badge.fury.io/js/depwalker)
[![npm downloads](https://img.shields.io/npm/dm/depwalker.svg)](https://www.npmjs.com/package/depwalker)
[![install size](https://packagephobia.com/badge?p=depwalker)](https://packagephobia.com/result?p=depwalker)
[![Coverage](https://codecov.io/gh/razrinn/depwalker/branch/main/graph/badge.svg)](https://codecov.io/gh/razrinn/depwalker)
[![Tests](https://github.com/razrinn/depwalker/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/razrinn/depwalker/actions/workflows/ci-cd.yml)

A comprehensive TypeScript-based dependency analysis tool that tracks the impact of code changes across your codebase. DepWalker analyzes your Git changes and shows you which functions and variables are affected, along with their dependency chains and usage patterns.

## 🎯 Use Cases

- **Impact Analysis**: Understand which functions and components are affected by your changes
- **Pre-commit Review**: See the scope of impact before committing changes
- **Test Planning**: Identify which parts need testing after modifications
- **Refactoring Safety**: Verify dependencies when refactoring shared code
- **Configuration Changes**: Track how variable/constant changes affect dependent code
- **Large Codebases**: Use depth limits and filters for focused analysis in complex projects

## 📦 Installation

**Prerequisites:** Node.js (v20+) and Git

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
# Output formats
depwalker --format tree    # Tree view
depwalker --format json    # JSON for CI/CD

# Large codebase options
depwalker --compact --max-nodes 50
depwalker --no-variables   # Functions only

# Combined options
depwalker --depth 3 --format tree --compact --tsconfig ./tsconfig.json
```

### Pre-commit Integration

Add to your `package.json`:

```json
{
  "scripts": {
    "pre-commit": "depwalker --depth 3",
    "commit-check": "npm run pre-commit && echo 'Ready to commit!'"
  }
}
```

Run before committing:

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
          node-version: '20'
      - name: Analyze Impact
        run: |
          npx depwalker --format json > impact.json
          echo "## 📊 Impact Analysis" >> $GITHUB_STEP_SUMMARY
          echo "\`\`\`json" >> $GITHUB_STEP_SUMMARY
          cat impact.json >> $GITHUB_STEP_SUMMARY
          echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
```

### Example Output

**Tree Format:**

```
🚀 DepWalker - TypeScript Dependency Analysis
✓ Analysis complete - 3 changed functions identified

🎯 Change Source: handleClick (line ~23)
    ├── ButtonGroup in src/components/ButtonGroup.tsx
    └── Toolbar in src/components/Toolbar.tsx
        └── MainLayout in src/layouts/MainLayout.tsx
```

**JSON Format** (for CI/CD):

```bash
depwalker --format json > analysis-report.json
```


## 🏗️ How It Works

1. **Git Analysis**: Fetches uncommitted changes via `git diff`
2. **TypeScript Parsing**: Uses TypeScript Compiler API to build function call and variable usage graphs
3. **Impact Analysis**: Traverses dependency graphs to find affected functions and variables
4. **Smart Output**: Presents results with file grouping, circular reference detection, and impact statistics

## 🔧 Configuration

### Command Line Options

**Core Options:**

- `-d, --depth <number>` - Maximum analysis depth. Default: no limit
- `-t, --tsconfig <path>` - TypeScript config file path. Default: ./tsconfig.json
- `-f, --format <type>` - Output format: `list`, `tree`, `json`. Default: `list`

**Display Options:**

- `--compact` - Reduce duplicate references
- `--max-nodes <number>` - Limit total output nodes
- `--no-file-grouping` - Show functions separately
- `--no-variables` - Functions only, skip variables

**Examples:**

```bash
depwalker --depth 3 --compact
depwalker --format json > report.json
depwalker --tsconfig ./tsconfig.prod.json
```

## 🤝 Contributing

Contributions are welcome! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) file for detailed guidelines on how to contribute to this project.

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

Ray Azrin Karim

## 🙏 Acknowledgments

- Built with TypeScript Compiler API
- Inspired by the need for better impact analysis in large codebases

---

Made with ❤️ by Ray Azrin Karim
