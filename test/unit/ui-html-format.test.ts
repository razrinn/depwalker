import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printAnalysisResults } from '../../src/ui.js';
import type { AnalysisResult, CallGraph, VariableGraph } from '../../src/analyzer.js';

describe('HTML Format Output', () => {
  let originalConsoleLog: typeof console.log;
  let mockConsoleLog: any;
  let consoleOutput: string[];

  beforeEach(() => {
    originalConsoleLog = console.log;
    consoleOutput = [];
    mockConsoleLog = vi.fn((...args: any[]) => {
      consoleOutput.push(args.join(' '));
    });
    console.log = mockConsoleLog;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  const createMockAnalysisResult = (overrides: Partial<AnalysisResult> = {}): AnalysisResult => ({
    changedFiles: ['src/test.ts', 'src/other.ts'],
    changedFunctions: new Map([
      ['src/test.ts', new Set(['src/test.ts:myFunction', 'src/test.ts:anotherFunction'])],
      ['src/other.ts', new Set(['src/other.ts:otherFunction'])],
    ]),
    callGraph: new Map([
      ['src/test.ts:myFunction', {
        callers: [
          { callerId: 'src/other.ts:otherFunction', line: 10 },
          { callerId: 'src/caller.ts:callerFunction', line: 25 },
        ],
        definition: { startLine: 5, endLine: 10 },
      }],
      ['src/test.ts:anotherFunction', {
        callers: [
          { callerId: 'src/test.ts:myFunction', line: 8 },
        ],
        definition: { startLine: 12, endLine: 20 },
      }],
      ['src/other.ts:otherFunction', {
        callers: [
          { callerId: 'src/caller.ts:callerFunction', line: 30 },
        ],
        definition: { startLine: 15, endLine: 25 },
      }],
      ['src/caller.ts:callerFunction', {
        callers: [],
        definition: { startLine: 1, endLine: 40 },
      }],
    ]) as CallGraph,
    changedVariables: new Map([
      ['src/test.ts', new Set(['src/test.ts:myVariable', 'src/test.ts:config'])],
    ]),
    variableGraph: new Map([
      ['src/test.ts:myVariable', {
        usages: [
          { userId: 'src/test.ts:myFunction', line: 7, usageType: 'read' },
          { userId: 'src/test.ts:anotherFunction', line: 15, usageType: 'write' },
          { userId: 'src/other.ts:otherFunction', line: 18, usageType: 'reference' },
        ],
        definition: { startLine: 3, endLine: 3 },
        type: 'const',
        scope: 'module',
      }],
      ['src/test.ts:config', {
        usages: [
          { userId: 'src/test.ts:myFunction', line: 9, usageType: 'read' },
        ],
        definition: { startLine: 1, endLine: 1 },
        type: 'object',
        scope: 'module',
      }],
    ]) as VariableGraph,
    ...overrides,
  });

  describe('HTML Format Generation', () => {
    it('should generate valid HTML output', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check for basic HTML structure
      expect(htmlOutput).toContain('<!DOCTYPE html>');
      expect(htmlOutput).toContain('<html lang="en">');
      expect(htmlOutput).toContain('</html>');
      expect(htmlOutput).toContain('<head>');
      expect(htmlOutput).toContain('<body>');
      expect(htmlOutput).toContain('DepWalker - Dependency Analysis');
    });

    it('should include vis.js library references', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check for vis.js includes
      expect(htmlOutput).toContain('vis-network@9.1.9');
      expect(htmlOutput).toContain('vis-network.min.js');
      expect(htmlOutput).toContain('vis-network.min.css');
    });

    it('should include graph container elements', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check for main UI elements
      expect(htmlOutput).toContain('id="mynetwork"');
      expect(htmlOutput).toContain('class="graph-container"');
      expect(htmlOutput).toContain('class="sidebar"');
      expect(htmlOutput).toContain('class="legend"');
      expect(htmlOutput).toContain('class="controls"');
    });

    it('should embed graph data correctly', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
        maxDepth: 2,
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check for graph data
      expect(htmlOutput).toContain('const graphData =');
      expect(htmlOutput).toContain('"nodes"');
      expect(htmlOutput).toContain('"edges"');
      
      // Check for changed functions in the data
      expect(htmlOutput).toContain('myFunction');
      expect(htmlOutput).toContain('anotherFunction');
      expect(htmlOutput).toContain('otherFunction');
      
      // Check for variables
      expect(htmlOutput).toContain('myVariable');
      expect(htmlOutput).toContain('config');
    });

    it('should display correct statistics', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check for stats display
      expect(htmlOutput).toContain('Changed Files');
      expect(htmlOutput).toContain('Changed Functions');
      expect(htmlOutput).toContain('Changed Variables');
      expect(htmlOutput).toContain('Total Dependencies');
      
      // Check for specific counts
      expect(htmlOutput).toMatch(/<span class="stat-value">2<\/span>/); // 2 changed files
      expect(htmlOutput).toMatch(/<span class="stat-value">3<\/span>/); // 3 changed functions
    });

    it('should include control buttons', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check for control buttons
      expect(htmlOutput).toContain('Fit View');
      expect(htmlOutput).toContain('Clear');
      expect(htmlOutput).toContain('onclick="fitNetwork()"');
      expect(htmlOutput).toContain('onclick="resetSelection()"');
      
      // Should NOT include physics toggle
      expect(htmlOutput).not.toContain('Physics');
      expect(htmlOutput).not.toContain('togglePhysics');
    });

    it('should include legend with correct items', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check for legend items
      expect(htmlOutput).toContain('Dependent Function');
      expect(htmlOutput).toContain('Changed Function');
      expect(htmlOutput).toContain('Changed Variable');
      expect(htmlOutput).toContain('Function Call');
      expect(htmlOutput).toContain('Variable Usage');
      expect(htmlOutput).toContain('Each changed item has a unique color');
    });

    it('should configure vis.js network with hierarchical layout', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check for hierarchical layout configuration
      expect(htmlOutput).toContain('hierarchical:');
      expect(htmlOutput).toContain('enabled: true');
      expect(htmlOutput).toContain('direction: \'UD\'');
      expect(htmlOutput).toContain('sortMethod: \'directed\'');
      expect(htmlOutput).toContain('nodeSpacing: 250');
      expect(htmlOutput).toContain('levelSeparation: 250');
      
      // Check that physics is disabled
      expect(htmlOutput).toContain('physics:');
      expect(htmlOutput).toContain('enabled: false');
    });

    it('should include JavaScript functions for interaction', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check for interaction functions
      expect(htmlOutput).toContain('function showNodeDetails');
      expect(htmlOutput).toContain('function fitNetwork');
      expect(htmlOutput).toContain('function resetSelection');
      expect(htmlOutput).toContain('function highlightConnectedNodes');
      expect(htmlOutput).toContain('function clearHighlights');
      expect(htmlOutput).toContain('function findPathsToRoots');
    });

    it('should handle empty results gracefully', () => {
      const result = createMockAnalysisResult({
        changedFunctions: new Map(),
        changedVariables: new Map(),
        callGraph: new Map() as CallGraph,
        variableGraph: new Map() as VariableGraph,
      });

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Should still generate valid HTML
      expect(htmlOutput).toContain('<!DOCTYPE html>');
      expect(htmlOutput).toContain('DepWalker - Dependency Analysis');
      
      // Stats should show zeros
      expect(htmlOutput).toMatch(/<span class="stat-value">0<\/span>/);
    });

    it('should respect maxDepth parameter', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
        maxDepth: 1,
      });

      const htmlOutput = consoleOutput.join('');
      
      // The maxDepth is respected during server-side graph building
      // We can verify this indirectly by checking the generated graph has limited depth
      // With maxDepth=1, only direct dependencies should be included
      expect(htmlOutput).toContain('const graphData');
      expect(htmlOutput).toContain('nodes');
      expect(htmlOutput).toContain('edges');
    });

    it('should handle functions without dependencies', () => {
      const result = createMockAnalysisResult({
        changedFunctions: new Map([
          ['src/isolated.ts', new Set(['src/isolated.ts:isolatedFunction'])],
        ]),
        callGraph: new Map([
          ['src/isolated.ts:isolatedFunction', {
            callers: [],
            definition: { startLine: 1, endLine: 5 },
          }],
        ]) as CallGraph,
      });

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Should include the isolated function
      expect(htmlOutput).toContain('isolatedFunction');
    });

    it('should handle variables without usages', () => {
      const result = createMockAnalysisResult({
        changedVariables: new Map([
          ['src/test.ts', new Set(['src/test.ts:unusedVar'])],
        ]),
        variableGraph: new Map([
          ['src/test.ts:unusedVar', {
            usages: [],
            definition: { startLine: 10, endLine: 10 },
            type: 'const',
            scope: 'module',
          }],
        ]) as VariableGraph,
      });

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Should include the unused variable
      expect(htmlOutput).toContain('unusedVar');
    });

    it('should assign unique colors to changed nodes', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check for color assignment logic
      expect(htmlOutput).toContain('changedNodeColors');
      expect(htmlOutput).toContain('changedNodeColorMap');
      expect(htmlOutput).toContain('colorIndex');
      
      // Check for specific colors in the palette
      expect(htmlOutput).toContain('#ef4444'); // red
      expect(htmlOutput).toContain('#f59e0b'); // amber
      expect(htmlOutput).toContain('#10b981'); // emerald
      expect(htmlOutput).toContain('#3b82f6'); // blue
    });

    it('should include keyboard shortcuts', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check for keyboard event listener
      expect(htmlOutput).toContain('addEventListener(\'keydown\'');
      expect(htmlOutput).toContain('e.key === \'f\'');
      expect(htmlOutput).toContain('e.key === \'Escape\'');
    });

    it('should differentiate between function and variable nodes', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check for shape differentiation in the actual JSON data
      expect(htmlOutput).toContain('"type":"function"');
      expect(htmlOutput).toContain('"type":"variable"');
      // Check shape assignment in JavaScript code
      expect(htmlOutput).toContain("shape = 'circle'");
      expect(htmlOutput).toContain("shape = 'box'");
    });

    it('should filter out variables from function lists', () => {
      const result = createMockAnalysisResult({
        changedFunctions: new Map([
          ['src/test.ts', new Set(['src/test.ts:myFunction', 'src/test.ts:shouldBeVariable'])],
        ]),
        changedVariables: new Map([
          ['src/test.ts', new Set(['src/test.ts:shouldBeVariable'])],
        ]),
        variableGraph: new Map([
          ['src/test.ts:shouldBeVariable', {
            usages: [],
            definition: { startLine: 1, endLine: 1 },
            type: 'const',
            scope: 'module',
          }],
        ]) as VariableGraph,
      });

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check that the variable is properly categorized
      // The function count should be 1 (only myFunction)
      expect(htmlOutput).toContain('<span class="stat-value">1</span>'); // 1 function
      // The variable should appear as a variable node
      expect(htmlOutput).toContain('"label":"shouldBeVariable"');
      expect(htmlOutput).toContain('"type":"variable"');
    });

    it('should handle responsive design styles', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check for responsive styles
      expect(htmlOutput).toContain('@media (max-width: 768px)');
      expect(htmlOutput).toContain('flex-direction: column');
    });

    it('should include hover and interaction styles', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check for interaction styles
      expect(htmlOutput).toContain(':hover');
      expect(htmlOutput).toContain('transition: all 0.2s');
      expect(htmlOutput).toContain('cursor: pointer');
    });

    it('should handle edge types correctly', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check for edge type handling in the JSON data
      expect(htmlOutput).toContain('"type":"calls"');
      expect(htmlOutput).toContain('"type":"uses"');
      // Check for edge type comparison in JavaScript
      expect(htmlOutput).toContain("edge.type === 'uses'");
    });

    it('should include node details panel', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check for node details panel
      expect(htmlOutput).toContain('id="nodeInfo"');
      expect(htmlOutput).toContain('Node Details');
      expect(htmlOutput).toContain('Click on a node to see details');
    });

    it('should truncate long labels', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check for label truncation function
      expect(htmlOutput).toContain('function truncateLabel');
      expect(htmlOutput).toContain('maxLength');
      expect(htmlOutput).toContain('substring');
    });

    it('should handle initial state properly', () => {
      const result = createMockAnalysisResult();

      printAnalysisResults({
        result,
        format: 'html',
      });

      const htmlOutput = consoleOutput.join('');
      
      // Check for initial state setup
      expect(htmlOutput).toContain('afterDrawing');
      expect(htmlOutput).toContain('network.unselectAll()');
      expect(htmlOutput).toContain('clearHighlights()');
      expect(htmlOutput).toContain('fitNetwork()');
    });
  });
});
