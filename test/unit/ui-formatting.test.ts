import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printAnalysisResults } from '../../src/ui.js';
import type { AnalysisResult, CallGraph, VariableGraph } from '../../src/analyzer.js';

describe('UI Formatting Functions', () => {
  let originalConsoleLog: typeof console.log;
  let mockConsoleLog: any;

  beforeEach(() => {
    originalConsoleLog = console.log;
    mockConsoleLog = vi.fn();
    console.log = mockConsoleLog;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  const createMockAnalysisResult = (overrides: Partial<AnalysisResult> = {}): AnalysisResult => ({
    changedFiles: ['src/test.ts'],
    changedFunctions: new Map([
      ['src/test.ts', new Set(['src/test.ts:myFunction'])],
    ]),
    callGraph: new Map([
      ['src/test.ts:myFunction', {
        callers: [{ callerId: 'src/other.ts:otherFunction', line: 10 }],
        definition: { startLine: 5, endLine: 10 },
      }],
      ['src/other.ts:otherFunction', {
        callers: [],
        definition: { startLine: 15, endLine: 20 },
      }],
    ]) as CallGraph,
    changedVariables: new Map([
      ['src/test.ts', new Set(['src/test.ts:myVariable'])],
    ]),
    variableGraph: new Map([
      ['src/test.ts:myVariable', {
        usages: [
          {
            userId: 'src/test.ts:myFunction',
            line: 7,
            usageType: 'read',
          },
        ],
        definition: { startLine: 3, endLine: 3 },
        type: 'const',
        scope: 'module',
      }],
    ]) as VariableGraph,
    ...overrides,
  });

  describe('printAnalysisResults', () => {
    it('should handle empty changed files', () => {
      const result = createMockAnalysisResult({
        changedFiles: [],
      });

      printAnalysisResults({
        result,
        format: 'tree',
      });

      expect(mockConsoleLog).toHaveBeenCalledWith('✅ No TypeScript files have changed.');
    });

    it('should handle no changed functions or variables', () => {
      const result = createMockAnalysisResult({
        changedFunctions: new Map(),
        changedVariables: new Map(),
      });

      printAnalysisResults({
        result,
        format: 'tree',
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('No changed functions or variables were detected')
      );
    });

    it('should print tree format with functions', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'tree',
        maxDepth: 2,
        compact: false,
        maxNodes: 10,
        groupByFile: true,
      });

      // Check that tree format output was generated - the actual call splits the text
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🔍 Changed files:',
        'src/test.ts'
      );
    });

    it('should print list format', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'list',
        maxDepth: 2,
      });

      // Should generate list format output
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should print JSON format', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'json',
        maxDepth: 2,
      });

      // JSON format should be printed to console
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('changedFiles')
      );
    });

    it('should handle compact mode', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'tree',
        compact: true,
        maxNodes: 5,
      });

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should handle tree format with variables', () => {
      const result = createMockAnalysisResult({
        changedVariables: new Map([
          ['src/test.ts', new Set(['src/test.ts:myVariable', 'src/test.ts:otherVar'])],
        ]),
        variableGraph: new Map([
          ['src/test.ts:myVariable', {
            usages: [
              { userId: 'src/test.ts:myFunction', line: 7, usageType: 'read' },
              { userId: 'src/test.ts:anotherFunction', line: 12, usageType: 'write' },
            ],
            definition: { startLine: 3, endLine: 3 },
            type: 'const',
            scope: 'module',
          }],
          ['src/test.ts:otherVar', {
            usages: [],
            definition: { startLine: 8, endLine: 8 },
            type: 'let',
            scope: 'function',
          }],
        ]) as VariableGraph,
      });

      printAnalysisResults({
        result,
        format: 'tree',
      });

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should handle list format with variables', () => {
      const result = createMockAnalysisResult({
        changedVariables: new Map([
          ['src/test.ts', new Set(['src/test.ts:myVariable'])],
        ]),
        variableGraph: new Map([
          ['src/test.ts:myVariable', {
            usages: [
              { userId: 'src/test.ts:myFunction', line: 7, usageType: 'read' },
            ],
            definition: { startLine: 3, endLine: 3 },
            type: 'const',
            scope: 'module',
          }],
        ]) as VariableGraph,
      });

      printAnalysisResults({
        result,
        format: 'list',
      });

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should handle functions without callers', () => {
      const result = createMockAnalysisResult({
        callGraph: new Map([
          ['src/test.ts:myFunction', {
            callers: [],
            definition: { startLine: 5, endLine: 10 },
          }],
        ]) as CallGraph,
      });

      printAnalysisResults({
        result,
        format: 'tree',
      });

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should handle variables without usages', () => {
      const result = createMockAnalysisResult({
        changedVariables: new Map([
          ['src/test.ts', new Set(['src/test.ts:unusedVar'])],
        ]),
        variableGraph: new Map([
          ['src/test.ts:unusedVar', {
            usages: [],
            definition: { startLine: 3, endLine: 3 },
            type: 'const',
            scope: 'module',
          }],
        ]) as VariableGraph,
      });

      printAnalysisResults({
        result,
        format: 'tree',
      });

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should handle complex dependency trees', () => {
      const result = createMockAnalysisResult({
        callGraph: new Map([
          ['src/test.ts:myFunction', {
            callers: [
              { callerId: 'src/other.ts:caller1', line: 10 },
              { callerId: 'src/other.ts:caller2', line: 15 },
              { callerId: 'src/different.ts:caller3', line: 20 },
            ],
            definition: { startLine: 5, endLine: 10 },
          }],
          ['src/other.ts:caller1', {
            callers: [{ callerId: 'src/final.ts:finalCaller', line: 25 }],
            definition: { startLine: 5, endLine: 8 },
          }],
          ['src/other.ts:caller2', {
            callers: [],
            definition: { startLine: 12, endLine: 18 },
          }],
          ['src/different.ts:caller3', {
            callers: [],
            definition: { startLine: 15, endLine: 22 },
          }],
          ['src/final.ts:finalCaller', {
            callers: [],
            definition: { startLine: 20, endLine: 30 },
          }],
        ]) as CallGraph,
      });

      printAnalysisResults({
        result,
        format: 'tree',
        maxDepth: 3,
        groupByFile: true,
      });

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should handle high-impact analysis with many callers', () => {
      const callers = Array.from({ length: 20 }, (_, i) => ({
        callerId: `src/caller${i}.ts:function${i}`,
        line: i * 5,
      }));

      const callGraph = new Map([
        ['src/test.ts:popularFunction', {
          callers,
          definition: { startLine: 1, endLine: 10 },
        }],
      ]);

      // Add all caller functions to the call graph
      callers.forEach(caller => {
        callGraph.set(caller.callerId, {
          callers: [],
          definition: { startLine: 1, endLine: 5 },
        });
      });

      const result = createMockAnalysisResult({
        changedFunctions: new Map([
          ['src/test.ts', new Set(['src/test.ts:popularFunction'])],
        ]),
        callGraph: callGraph as CallGraph,
      });

      printAnalysisResults({
        result,
        format: 'tree',
        compact: true,
      });

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should handle mixed variable usage types', () => {
      const result = createMockAnalysisResult({
        changedVariables: new Map([
          ['src/test.ts', new Set(['src/test.ts:complexVar'])],
        ]),
        variableGraph: new Map([
          ['src/test.ts:complexVar', {
            usages: [
              { userId: 'src/test.ts:reader', line: 7, usageType: 'read' },
              { userId: 'src/test.ts:writer', line: 12, usageType: 'write' },
              { userId: 'src/test.ts:referencer', line: 18, usageType: 'reference' },
            ],
            definition: { startLine: 3, endLine: 3 },
            type: 'let',
            scope: 'module',
          }],
        ]) as VariableGraph,
      });

      printAnalysisResults({
        result,
        format: 'tree',
      });

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should handle JSON format with variables', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'json',
        maxDepth: 2,
      });

      // Should output structured JSON
      const jsonCalls = mockConsoleLog.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('changedFiles')
      );
      expect(jsonCalls).toBeDefined();
    });

    it('should filter out variables from function display', () => {
      // Test case where a variable ID mistakenly appears in changedFunctions
      const result = createMockAnalysisResult({
        changedFunctions: new Map([
          ['src/test.ts', new Set(['src/test.ts:myVariable', 'src/test.ts:realFunction'])],
        ]),
        callGraph: new Map([
          ['src/test.ts:realFunction', {
            callers: [],
            definition: { startLine: 10, endLine: 15 },
          }],
        ]) as CallGraph,
        changedVariables: new Map([
          ['src/test.ts', new Set(['src/test.ts:myVariable'])],
        ]),
        variableGraph: new Map([
          ['src/test.ts:myVariable', {
            usages: [],
            definition: { startLine: 3, endLine: 3 },
            type: 'const',
            scope: 'module',
          }],
        ]) as VariableGraph,
      });

      printAnalysisResults({
        result,
        format: 'tree',
      });

      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });
});
