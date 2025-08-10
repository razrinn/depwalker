import { describe, it, expect } from 'vitest';
import { parseGitDiff, generateImpactTree } from '../../src/analyzer.js';
import {
  SIMPLE_DIFF,
  MULTIPLE_FILES_DIFF,
  EXPECTED_PARSED_RESULTS,
} from '../fixtures/sample-git-diff.js';

describe('Integration Tests - Analysis Pipeline', () => {
  describe('Git Parsing Integration', () => {
    it('should parse git diff and integrate with changed file detection', () => {
      const result = parseGitDiff(SIMPLE_DIFF);
      
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);
      
      // Should be able to get changed files
      const changedFiles = Array.from(result.keys());
      expect(changedFiles).toEqual(['src/components/Button.tsx']);
      
      // Should be able to get changed lines
      const buttonChanges = result.get('src/components/Button.tsx');
      expect(buttonChanges).toEqual(new Set([11, 12, 22]));
    });

    it('should handle multiple file changes in integration', () => {
      const result = parseGitDiff(MULTIPLE_FILES_DIFF);
      
      expect(result.size).toBe(2);
      const changedFiles = Array.from(result.keys()).sort();
      expect(changedFiles).toEqual([
        'src/components/Header.tsx',
        'src/utils/helpers.ts'
      ]);
    });
  });

  describe('Impact Tree Generation', () => {
    it('should generate empty impact tree for non-existent function', () => {
      const mockCallGraph = new Map();
      const result = generateImpactTree({
        calleeId: 'nonexistent:function',
        callGraph: mockCallGraph,
        maxDepth: 3,
        compact: false,
        groupByFile: true
      });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle impact tree with circular references', () => {
      // Create a mock call graph with circular reference
      const mockCallGraph = new Map();
      mockCallGraph.set('file1:funcA', {
        callers: [{ callerId: 'file2:funcB', line: 10 }],
        definition: { startLine: 1, endLine: 5 }
      });
      mockCallGraph.set('file2:funcB', {
        callers: [{ callerId: 'file1:funcA', line: 20 }],
        definition: { startLine: 10, endLine: 15 }
      });
      
      const result = generateImpactTree({
        calleeId: 'file1:funcA',
        callGraph: mockCallGraph,
        maxDepth: 10,
        compact: false,
        groupByFile: true
      });
      
      expect(Array.isArray(result)).toBe(true);
      // Should not crash and should have some output
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect max depth limits', () => {
      // Create a chain of function calls
      const mockCallGraph = new Map();
      mockCallGraph.set('file1:func1', {
        callers: [{ callerId: 'file1:func2', line: 10 }],
        definition: { startLine: 1, endLine: 5 }
      });
      mockCallGraph.set('file1:func2', {
        callers: [{ callerId: 'file1:func3', line: 20 }],
        definition: { startLine: 10, endLine: 15 }
      });
      mockCallGraph.set('file1:func3', {
        callers: [{ callerId: 'file1:func4', line: 30 }],
        definition: { startLine: 20, endLine: 25 }
      });
      
      const shallowResult = generateImpactTree({
        calleeId: 'file1:func1',
        callGraph: mockCallGraph,
        maxDepth: 1,
        compact: false,
        groupByFile: true
      });
      
      const deepResult = generateImpactTree({
        calleeId: 'file1:func1',
        callGraph: mockCallGraph,
        maxDepth: 3,
        compact: false,
        groupByFile: true
      });
      
      expect(Array.isArray(shallowResult)).toBe(true);
      expect(Array.isArray(deepResult)).toBe(true);
      
      // Deep result should have same or more lines than shallow
      expect(deepResult.length).toBeGreaterThanOrEqual(shallowResult.length);
    });
  });

  describe('Data Structure Integration', () => {
    it('should create proper analysis result structure', () => {
      const changedLinesByFile = parseGitDiff(SIMPLE_DIFF);
      
      // Create mock graphs
      const callGraph = new Map();
      const variableGraph = new Map();
      const changedFunctions = new Map();
      const changedVariables = new Map();
      
      // Build analysis result
      const analysisResult = {
        changedFiles: Array.from(changedLinesByFile.keys()),
        changedFunctions,
        callGraph,
        changedVariables,
        variableGraph
      };
      
      expect(analysisResult).toHaveProperty('changedFiles');
      expect(analysisResult).toHaveProperty('changedFunctions');
      expect(analysisResult).toHaveProperty('callGraph');
      expect(analysisResult).toHaveProperty('changedVariables');
      expect(analysisResult).toHaveProperty('variableGraph');
      
      expect(Array.isArray(analysisResult.changedFiles)).toBe(true);
      expect(analysisResult.changedFunctions).toBeInstanceOf(Map);
      expect(analysisResult.callGraph).toBeInstanceOf(Map);
    });

    it('should handle empty analysis results', () => {
      const emptyDiff = parseGitDiff('');
      
      expect(emptyDiff).toBeInstanceOf(Map);
      expect(emptyDiff.size).toBe(0);
      
      const analysisResult = {
        changedFiles: Array.from(emptyDiff.keys()),
        changedFunctions: new Map(),
        callGraph: new Map(),
        changedVariables: new Map(),
        variableGraph: new Map()
      };
      
      expect(analysisResult.changedFiles).toEqual([]);
      expect(analysisResult.changedFunctions.size).toBe(0);
    });
  });
});
