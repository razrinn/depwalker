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
# or with depth limit
npx depwalker --depth 3
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

```bash
# Basic usage
npx depwalker

# With depth limit (useful for large codebases)
depwalker --depth 3
```

### Pre-commit Integration

Add DepWalker to your pre-commit workflow to analyze impact before committing:

**Option 1: Git Hook**

Create `.git/hooks/pre-commit`:

```bash
#!/bin/sh
echo "🔍 Analyzing dependency impact..."
npx depwalker --depth 3
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
    "pre-commit": "depwalker --depth 3",
    "commit-check": "npm run pre-commit && echo 'Ready to commit!'"
  }
}
```

Then run before committing:

```bash
npm run commit-check
```

### Example Output

```
🔍 Changed files: [.../src/components/Button.tsx, .../src/utils/helpers.ts]

---
Analyzing...

---
Detected changes in these functions:
  In src/components/Button.tsx:
    - handleClick
  In src/utils/helpers.ts:
    - formatDate

💥 Dependency Walker Analysis 💥

📁 Changes in: src/components/Button.tsx
==================================================

🎯 Change Source: handleClick (line ~23)
--------------------------------------------------
    ├── ButtonGroup in src/components/ButtonGroup.tsx (line ~45)
    │   └── Toolbar in src/components/Toolbar.tsx (line ~12)
    │       └── MainLayout in src/layouts/MainLayout.tsx (line ~78)
    └── ActionPanel in src/components/ActionPanel.tsx (line ~34)
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
│   └── index.ts        # Main application logic
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

4. **Impact Analysis**: For each changed function, it traverses the dependency graph to find all functions that directly or indirectly depend on it.

5. **Visual Output**: Finally, it presents the results in a tree format showing the complete impact chain of your changes.

## 🔧 Configuration

DepWalker uses your project's `tsconfig.json` file for TypeScript compilation settings. Make sure your `tsconfig.json` is properly configured for your project.

### TypeScript Config Requirements

Your `tsconfig.json` should include:

- Proper `include` and `exclude` paths
- Module resolution settings
- Target and lib configurations

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
