import { describe, it, expect, vi } from 'vitest';
import * as ts from 'typescript';
import {
  getVariableType,
  getVariableScope,
  createTsProgram,
  buildVariableGraph,
} from '../../src/analyzer.js';

describe('Analyzer Edge Cases and Error Handling', () => {
  describe('getVariableType', () => {
    it('should return "export" for export specifiers', () => {
      // Create a mock export specifier node
      const mockNode = {
        kind: ts.SyntaxKind.ExportSpecifier,
      } as ts.ExportSpecifier;

      const result = getVariableType(mockNode);
      expect(result).toBe('export');
    });

    it('should return "var" for unknown node types', () => {
      // Create a mock node that doesn't match any patterns
      const mockNode = {
        kind: ts.SyntaxKind.StringLiteral,
      } as ts.Node;

      const result = getVariableType(mockNode);
      expect(result).toBe('var');
    });

    it('should handle variable declaration with parent structure', () => {
      // Create a mock variable declaration with proper parent chain
      const mockNode = {
        kind: ts.SyntaxKind.VariableDeclaration,
        parent: {
          parent: {
            kind: ts.SyntaxKind.VariableStatement,
            declarationList: {
              flags: ts.NodeFlags.Const,
            },
          },
        },
      } as any;

      const result = getVariableType(mockNode);
      expect(result).toBe('const');
    });
  });

  describe('getVariableScope', () => {
    it('should return "global" for nodes without parents', () => {
      const mockNode = {
        parent: undefined,
      } as unknown as ts.Node;

      const result = getVariableScope(mockNode);
      expect(result).toBe('global');
    });

    it('should return "function" for nodes inside function declarations', () => {
      const mockNode = {
        parent: {
          kind: ts.SyntaxKind.FunctionDeclaration,
          parent: null,
        },
      } as any;

      const result = getVariableScope(mockNode);
      expect(result).toBe('function');
    });

    it('should return "function" for nodes inside arrow functions', () => {
      const mockNode = {
        parent: {
          kind: ts.SyntaxKind.ArrowFunction,
          parent: null,
        },
      } as any;

      const result = getVariableScope(mockNode);
      expect(result).toBe('function');
    });

    it('should return "function" for nodes inside function expressions', () => {
      const mockNode = {
        parent: {
          kind: ts.SyntaxKind.FunctionExpression,
          parent: null,
        },
      } as any;

      const result = getVariableScope(mockNode);
      expect(result).toBe('function');
    });

    it('should return "function" for nodes inside method declarations', () => {
      const mockNode = {
        parent: {
          kind: ts.SyntaxKind.MethodDeclaration,
          parent: null,
        },
      } as any;

      const result = getVariableScope(mockNode);
      expect(result).toBe('function');
    });

    it('should return "block" for nodes inside blocks', () => {
      const mockNode = {
        parent: {
          kind: ts.SyntaxKind.Block,
          parent: null,
        },
      } as any;

      const result = getVariableScope(mockNode);
      expect(result).toBe('block');
    });

    it('should return "module" for nodes inside source files', () => {
      const mockNode = {
        parent: {
          kind: ts.SyntaxKind.SourceFile,
          parent: null,
        },
      } as any;

      const result = getVariableScope(mockNode);
      expect(result).toBe('module');
    });
  });

  describe('TypeScript Program Creation Error Handling', () => {
    it('should handle non-existent tsconfig files', () => {
      expect(() => {
        createTsProgram('./non-existent-config.json');
      }).toThrow(/Failed to read tsconfig file/);
    });
  });

  describe('Variable functions edge cases', () => {
    it('should handle variable declaration without parent chain', () => {
      // Test the fallback case by using a non-variable declaration node
      const mockNode = {
        kind: ts.SyntaxKind.Identifier, // Not a variable declaration
      } as any;

      const result = getVariableType(mockNode);
      expect(result).toBe('var'); // fallback
    });

    it('should handle variable declaration with incomplete parent chain', () => {
      const mockNode = {
        kind: ts.SyntaxKind.VariableDeclaration,
        parent: {
          parent: {
            kind: ts.SyntaxKind.Block, // not a VariableStatement
            declarationList: null,
          },
        },
      } as any;

      const result = getVariableType(mockNode);
      expect(result).toBe('var'); // fallback
    });

    it('should handle let flag correctly', () => {
      const mockNode = {
        kind: ts.SyntaxKind.VariableDeclaration,
        parent: {
          parent: {
            kind: ts.SyntaxKind.VariableStatement,
            declarationList: {
              flags: ts.NodeFlags.Let,
            },
          },
        },
      } as any;

      const result = getVariableType(mockNode);
      expect(result).toBe('let');
    });

    it('should default to var when no specific flags are set', () => {
      const mockNode = {
        kind: ts.SyntaxKind.VariableDeclaration,
        parent: {
          parent: {
            kind: ts.SyntaxKind.VariableStatement,
            declarationList: {
              flags: 0, // no flags set
            },
          },
        },
      } as any;

      const result = getVariableType(mockNode);
      expect(result).toBe('var');
    });
  });

  describe('Scope traversal edge cases', () => {
    it('should traverse multiple parent levels to find scope', () => {
      const mockNode = {
        parent: {
          kind: ts.SyntaxKind.Identifier,
          parent: {
            kind: ts.SyntaxKind.ExpressionStatement,
            parent: {
              kind: ts.SyntaxKind.FunctionDeclaration,
              parent: null,
            },
          },
        },
      } as any;

      const result = getVariableScope(mockNode);
      expect(result).toBe('function');
    });

    it('should handle deep nesting without stackoverflow', () => {
      // Create a deeply nested structure
      let current: any = { kind: ts.SyntaxKind.SourceFile, parent: null };

      // Create 10 levels of nesting
      for (let i = 0; i < 10; i++) {
        current = {
          kind: ts.SyntaxKind.Block,
          parent: current,
        };
      }

      const mockNode = {
        parent: current,
      } as any;

      const result = getVariableScope(mockNode);
      expect(result).toBe('block');
    });

    it('should stop at source file even with more parents', () => {
      const mockNode = {
        parent: {
          kind: ts.SyntaxKind.Identifier,
          parent: {
            kind: ts.SyntaxKind.SourceFile,
            parent: {
              // @ts-expect-error This shouldn't be reached
              kind: ts.SyntaxKind.Program,
              parent: null,
            },
          },
        },
      } as any;

      const result = getVariableScope(mockNode);
      expect(result).toBe('module');
    });
  });
});
