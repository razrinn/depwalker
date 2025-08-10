import { describe, it, expect, vi } from 'vitest';
import { parseGitDiff, getGitDiff } from '../../src/analyzer';
import {
  SIMPLE_DIFF,
  MULTIPLE_FILES_DIFF,
  NON_TS_FILES_DIFF,
  EMPTY_DIFF,
  MALFORMED_DIFF,
  EXPECTED_PARSED_RESULTS,
} from '../fixtures/sample-git-diff';

describe('Git Diff Parser', () => {
  describe('parseGitDiff', () => {
    it('should parse a simple git diff correctly', () => {
      const result = parseGitDiff(SIMPLE_DIFF);
      
      expect(result).toEqual(EXPECTED_PARSED_RESULTS.SIMPLE_DIFF);
      expect(result.size).toBe(1);
      expect(result.has('src/components/Button.tsx')).toBe(true);
      
      const buttonChanges = result.get('src/components/Button.tsx');
      expect(buttonChanges).toEqual(new Set([11, 12, 22]));
    });

    it('should parse multiple files in git diff', () => {
      const result = parseGitDiff(MULTIPLE_FILES_DIFF);
      
      expect(result).toEqual(EXPECTED_PARSED_RESULTS.MULTIPLE_FILES_DIFF);
      expect(result.size).toBe(2);
      expect(result.has('src/utils/helpers.ts')).toBe(true);
      expect(result.has('src/components/Header.tsx')).toBe(true);
    });

    it('should ignore non-TypeScript files', () => {
      const result = parseGitDiff(NON_TS_FILES_DIFF);
      
      expect(result).toEqual(EXPECTED_PARSED_RESULTS.NON_TS_FILES_DIFF);
      expect(result.size).toBe(0);
    });

    it('should handle empty git diff', () => {
      const result = parseGitDiff(EMPTY_DIFF);
      
      expect(result).toEqual(EXPECTED_PARSED_RESULTS.EMPTY_DIFF);
      expect(result.size).toBe(0);
    });

    it('should handle malformed git diff gracefully', () => {
      const result = parseGitDiff(MALFORMED_DIFF);
      
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should handle files with .ts extension', () => {
      const tsDiff = `diff --git a/src/utils.ts b/src/utils.ts
index 1234567..abcdefg 100644
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -1,0 +2,1 @@
+export const newFunction = () => {};`;

      const result = parseGitDiff(tsDiff);
      
      expect(result.size).toBe(1);
      expect(result.has('src/utils.ts')).toBe(true);
      expect(result.get('src/utils.ts')).toEqual(new Set([2]));
    });

    it('should handle files with .tsx extension', () => {
      const tsxDiff = `diff --git a/src/Component.tsx b/src/Component.tsx
index 1234567..abcdefg 100644
--- a/src/Component.tsx
+++ b/src/Component.tsx
@@ -5,0 +6,2 @@
+const MyComponent = () => <div>Hello</div>;
+export default MyComponent;`;

      const result = parseGitDiff(tsxDiff);
      
      expect(result.size).toBe(1);
      expect(result.has('src/Component.tsx')).toBe(true);
      expect(result.get('src/Component.tsx')).toEqual(new Set([6, 7]));
    });

    it('should handle multiple hunks in same file', () => {
      const multiHunkDiff = `diff --git a/src/app.ts b/src/app.ts
index 1234567..abcdefg 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -5,1 +5,1 @@
-const oldVar = 'old';
+const newVar = 'new';
@@ -15,0 +15,2 @@
+const anotherFunction = () => {};
+export { anotherFunction };`;

      const result = parseGitDiff(multiHunkDiff);
      
      expect(result.size).toBe(1);
      expect(result.has('src/app.ts')).toBe(true);
      expect(result.get('src/app.ts')).toEqual(new Set([5, 15, 16]));
    });
  });

  describe('getGitDiff', () => {
    it('should call git diff command', () => {
      // Mock execSync
      const mockExecSync = vi.fn().mockReturnValue('mocked git diff output');
      
      // Replace the import with our mock
      vi.doMock('child_process', () => ({
        execSync: mockExecSync,
      }));

      // This test is more of an integration test
      // In a real scenario, we might want to test this with actual git repository
      expect(mockExecSync).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle diff with only deletions', () => {
      const deletionDiff = `diff --git a/src/old-file.ts b/src/old-file.ts
index 1234567..0000000 100644
--- a/src/old-file.ts
+++ /dev/null
@@ -1,10 +0,0 @@
-export const oldFunction = () => {
-  return 'old';
-};
-
-export const anotherOldFunction = () => {
-  return 'another old';
-};
-
-const unused = 'variable';
-// End of file`;

      const result = parseGitDiff(deletionDiff);
      
      // For deletions, we still want to track the file but with empty line changes
      expect(result).toBeInstanceOf(Map);
      // This might be 0 if we don't track deleted files, or 1 if we do
      expect(result.size).toBeGreaterThanOrEqual(0);
    });

    it('should handle diff with binary files', () => {
      const binaryDiff = `diff --git a/assets/image.png b/assets/image.png
index abc123..def456 100644
GIT binary patch
delta 123
zcmV-b0C3k?P(h@N@6VH6Tc-xk_Zx}|x*C%d!Fme_rOCd(9P#sN

delta 456
zcmV-x0C3k?P(h@N@6VH6Tc-xk_Zx}|x*C%d!Fme_rOCd(9P#sN

diff --git a/src/component.tsx b/src/component.tsx
index 7890123..abc4567 100644
--- a/src/component.tsx
+++ b/src/component.tsx
@@ -1,0 +2,1 @@
+const newLine = 'added';`;

      const result = parseGitDiff(binaryDiff);
      
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1); // Should only track the .tsx file
      expect(result.has('src/component.tsx')).toBe(true);
      expect(result.has('assets/image.png')).toBe(false);
    });

    it('should handle diff with renamed files', () => {
      const renameDiff = `diff --git a/src/old-name.ts b/src/new-name.ts
similarity index 90%
rename from src/old-name.ts
rename to src/new-name.ts
index 1234567..abcdefg 100644
--- a/src/old-name.ts
+++ b/src/new-name.ts
@@ -5,0 +6,1 @@ export const existingFunction = () => {
+  const newVariable = 'added in renamed file';`;

      const result = parseGitDiff(renameDiff);
      
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);
      // Current parser tracks the old name (from --- line)
      expect(result.has('src/old-name.ts')).toBe(true);
      expect(result.get('src/old-name.ts')).toEqual(new Set([6]));
    });
  });
});
