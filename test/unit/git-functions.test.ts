import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { getGitDiff } from '../../src/analyzer.js';

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('Git Functions', () => {
  const mockExecSync = execSync as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGitDiff', () => {
    it('should execute git diff command', () => {
      const mockDiffOutput = `
diff --git a/src/test.ts b/src/test.ts
index 1234567..abcdefg 100644
--- a/src/test.ts
+++ b/src/test.ts
@@ -5,0 +6,1 @@
+const newVariable = 'added';
      `;
      
      mockExecSync.mockReturnValue(Buffer.from(mockDiffOutput));

      const result = getGitDiff();

      expect(mockExecSync).toHaveBeenCalledWith('git diff -U0 HEAD');
      expect(result).toBe(mockDiffOutput);
    });

    it('should handle empty git diff', () => {
      mockExecSync.mockReturnValue(Buffer.from(''));

      const result = getGitDiff();

      expect(mockExecSync).toHaveBeenCalledWith('git diff -U0 HEAD');
      expect(result).toBe('');
    });

    it('should propagate git command errors', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Git command failed');
      });

      expect(() => getGitDiff()).toThrow('Git command failed');
    });

    it('should handle git diff with multiple files', () => {
      const mockDiffOutput = `
diff --git a/src/file1.ts b/src/file1.ts
index 1111111..2222222 100644
--- a/src/file1.ts
+++ b/src/file1.ts
@@ -1,0 +2,1 @@
+const file1Change = 'added';

diff --git a/src/file2.ts b/src/file2.ts  
index 3333333..4444444 100644
--- a/src/file2.ts
+++ b/src/file2.ts
@@ -10,1 +10,1 @@
-const oldValue = 'old';
+const newValue = 'new';
      `;
      
      mockExecSync.mockReturnValue(Buffer.from(mockDiffOutput));

      const result = getGitDiff();

      expect(result).toBe(mockDiffOutput);
      expect(result).toContain('src/file1.ts');
      expect(result).toContain('src/file2.ts');
    });
  });
});
