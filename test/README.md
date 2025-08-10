# DepWalker Testing Suite

This document describes the testing setup and structure for the DepWalker project.

## 🧪 Test Framework

We use **Vitest** as our testing framework because it:
- Has excellent TypeScript support
- Fast and modern
- Built-in code coverage
- Great developer experience with watch mode and UI

## 📁 Test Structure

```
test/
├── README.md           # This file
├── setup.ts           # Global test setup
├── types.d.ts         # Type declarations for tests
├── fixtures/          # Test data and mocks
│   ├── sample-git-diff.ts     # Git diff test cases
│   └── sample-ts-files.ts     # TypeScript sample files
├── unit/              # Unit tests
│   ├── git-parser.test.ts     # Git parsing functionality
│   ├── ui.test.ts             # UI components (Spinner)
│   └── utils.test.ts          # Utility functions
└── integration/       # Integration tests
    └── analysis.test.ts       # Full pipeline tests
```

## 🏃 Running Tests

### Basic Commands

```bash
# Run tests once
pnpm test:run

# Run tests in watch mode
pnpm test

# Run tests with coverage
pnpm test:coverage

# Open test UI
pnpm test:ui
```

### Development Workflow

1. **During development**: Use `pnpm test` to run tests in watch mode
2. **Before committing**: Use `pnpm test:coverage` to check coverage
3. **CI/CD**: Uses `pnpm test:run` for single execution

## 📊 Coverage Goals

Current coverage thresholds (see `vitest.config.ts`):
- **Branches**: 70%
- **Functions**: 70% 
- **Lines**: 70%
- **Statements**: 70%

Coverage reports are generated in:
- `coverage/` directory (HTML report)
- Console output (text summary)

## 🧩 Test Categories

### Unit Tests

**Git Parser (`git-parser.test.ts`)**
- Tests git diff parsing functionality
- Covers edge cases like malformed diffs, multiple files
- Validates line number extraction

**Utilities (`utils.test.ts`)**
- Tests helper functions like `truncatePath`
- Tests TypeScript AST analysis functions
- Covers function and variable identification

**UI Components (`ui.test.ts`)**
- Tests Spinner component behavior
- Basic functionality tests (some mocking tests are skipped)

### Integration Tests

**Analysis Pipeline (`analysis.test.ts`)**
- Tests data flow between components
- Tests impact tree generation with mock data
- Validates error handling and edge cases

## 🔧 Test Fixtures

### Git Diff Samples
- `SIMPLE_DIFF`: Basic single-file change
- `MULTIPLE_FILES_DIFF`: Multi-file changes
- `NON_TS_FILES_DIFF`: Non-TypeScript files (should be ignored)
- `EMPTY_DIFF`: No changes
- `MALFORMED_DIFF`: Invalid diff format

### TypeScript Samples
- Mock React components
- Mock utility functions with dependencies
- Sample variable declarations and imports

## 🎯 Test Results

**Current Status**: ✅ All tests passing!
- **Total Tests**: 44 (0 skipped)
- **Test Files**: 4
- **Coverage**: ~16% overall (focused on critical functions)

**Coverage Details**:
- **analyzer.ts**: 25.44% (core parsing and analysis functions)
- **ui.ts**: 8.23% (UI components with proper stdout mocking)

## 🚨 Known Limitations

1. **Complex TypeScript Program Testing**: Creating full mock TypeScript programs is complex, so we focus on testing the public API and data structures.

2. **Coverage Focus**: We prioritize testing critical user-facing functions over internal implementation details.

3. **File System Dependencies**: Tests use mock data rather than real file system operations for reliability and speed.

## 🔄 CI/CD Integration

Tests are automatically run in GitHub Actions on:
- Push to `main` or `develop`
- Pull requests to `main`

The CI pipeline:
1. Runs tests on Node.js 18, 20, and 22
2. Generates coverage reports
3. Runs integration tests with the built CLI
4. Uploads coverage to Codecov (if configured)

## 📝 Adding New Tests

### Unit Test Template
```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../../src/module';

describe('Module Name', () => {
  describe('functionToTest', () => {
    it('should do something', () => {
      const result = functionToTest('input');
      expect(result).toBe('expected');
    });
  });
});
```

### Integration Test Template
```typescript
import { describe, it, expect } from 'vitest';
import { parseGitDiff } from '../../src/analyzer';

describe('Integration: Feature Name', () => {
  it('should handle end-to-end scenario', () => {
    const input = 'test input';
    const result = parseGitDiff(input);
    
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBeGreaterThan(0);
  });
});
```

## 🎯 Testing Philosophy

1. **Focus on Public APIs**: Test the interfaces that external users will interact with
2. **Use Real Data When Possible**: Prefer real git diffs and TypeScript code samples
3. **Test Edge Cases**: Include malformed input, empty data, and error conditions
4. **Keep Tests Fast**: Use mocks for expensive operations like file system access
5. **Maintain Readability**: Tests should be clear documentation of expected behavior

## 🔍 Debugging Tests

### Watch Mode
Use `pnpm test` to run tests in watch mode. Tests will re-run when files change.

### Test UI
Use `pnpm test:ui` to open Vitest's web-based UI for interactive debugging.

### Coverage Inspection
After running `pnpm test:coverage`, open `coverage/index.html` to see detailed coverage reports.

### Debugging Specific Tests
```bash
# Run specific test file
pnpm vitest git-parser.test.ts

# Run specific test case
pnpm vitest -t "should parse a simple git diff"
```
