import { execSync } from 'child_process';

/**
 * Get git diff of uncommitted changes
 */
export function getGitDiff(): string {
  return execSync('git diff -U0 HEAD', { encoding: 'utf-8' });
}

/**
 * Parse git diff output to extract changed line numbers per file
 */
export function parseGitDiff(diffOutput: string): Map<string, Set<number>> {
  const changedLines = new Map<string, Set<number>>();
  let currentFile: string | null = null;

  const fileRegex = /^--- a\/(.*)$/;
  const hunkRegex = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;

  for (const line of diffOutput.split('\n')) {
    // Check for file path
    const fileMatch = line.match(fileRegex);
    if (fileMatch?.[1]) {
      const fileName = fileMatch[1];
      // Only track TypeScript files
      if (!/\.(ts|tsx)$/.test(fileName)) {
        currentFile = null;
        continue;
      }
      currentFile = fileName;
      if (!changedLines.has(currentFile)) {
        changedLines.set(currentFile, new Set());
      }
      continue;
    }

    // Parse hunk headers to get line numbers
    if (currentFile) {
      const hunkMatch = line.match(hunkRegex);
      if (hunkMatch?.[1]) {
        const startLine = parseInt(hunkMatch[1], 10);
        const lineCount = hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1;
        const fileChangedLines = changedLines.get(currentFile);
        if (fileChangedLines) {
          for (let i = 0; i < lineCount; i++) {
            fileChangedLines.add(startLine + i);
          }
        }
      }
    }
  }

  return changedLines;
}
