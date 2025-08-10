import { describe, it, expect } from 'vitest';
import { truncatePath, getFunctionId, getVariableId } from '../../src/analyzer.js';
import { createMockSourceFile } from '../fixtures/sample-ts-files.js';
import * as ts from 'typescript';

describe('Utility Functions', () => {
  describe('truncatePath', () => {
    it('should truncate long paths', () => {
      const longPath = 'very/deep/nested/folder/structure/file.ts';
      const result = truncatePath(longPath, 3);
      
      expect(result).toBe('.../nested/folder/structure/file.ts');
    });

    it('should not truncate short paths', () => {
      const shortPath = 'src/file.ts';
      const result = truncatePath(shortPath, 3);
      
      expect(result).toBe('src/file.ts');
    });

    it('should handle single file names', () => {
      const fileName = 'file.ts';
      const result = truncatePath(fileName, 3);
      
      expect(result).toBe('file.ts');
    });

    it('should use default numDirs parameter', () => {
      const longPath = 'very/deep/nested/folder/structure/file.ts';
      const result = truncatePath(longPath); // Default should be 3
      
      expect(result).toBe('.../nested/folder/structure/file.ts');
    });
  });

  describe('getFunctionId', () => {
    it('should identify function declarations', () => {
      const code = `
        function myFunction() {
          return 'hello';
        }
      `;
      const sourceFile = createMockSourceFile(code, 'test.ts');
      
      // Find the function declaration node
      let functionNode: ts.FunctionDeclaration | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isFunctionDeclaration(node)) {
          functionNode = node;
        }
      });

      expect(functionNode).toBeDefined();
      const result = getFunctionId(functionNode!, sourceFile);
      expect(result).toBe('test.ts:myFunction');
    });

    it('should identify arrow function variables', () => {
      const code = `
        const myArrowFunction = () => {
          return 'hello';
        };
      `;
      const sourceFile = createMockSourceFile(code, 'test.ts');
      
      // Find the variable declaration node
      let variableNode: ts.VariableDeclaration | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isVariableStatement(node)) {
          const declaration = node.declarationList.declarations[0];
          if (declaration) {
            variableNode = declaration;
          }
        }
      });

      expect(variableNode).toBeDefined();
      const result = getFunctionId(variableNode!, sourceFile);
      expect(result).toBe('test.ts:myArrowFunction');
    });

    it('should identify React component functions', () => {
      const code = `
        const MyComponent = () => {
          return <div>Hello</div>;
        };
      `;
      const sourceFile = createMockSourceFile(code, 'Component.tsx');
      
      // Find the variable declaration node
      let variableNode: ts.VariableDeclaration | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isVariableStatement(node)) {
          const declaration = node.declarationList.declarations[0];
          if (declaration) {
            variableNode = declaration;
          }
        }
      });

      expect(variableNode).toBeDefined();
      const result = getFunctionId(variableNode!, sourceFile);
      expect(result).toBe('Component.tsx:MyComponent');
    });

    it('should return null for non-function nodes', () => {
      const code = `
        const regularVariable = 'not a function';
      `;
      const sourceFile = createMockSourceFile(code, 'test.ts');
      
      // Find the variable declaration node
      let variableNode: ts.VariableDeclaration | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isVariableStatement(node)) {
          const declaration = node.declarationList.declarations[0];
          if (declaration) {
            variableNode = declaration;
          }
        }
      });

      expect(variableNode).toBeDefined();
      const result = getFunctionId(variableNode!, sourceFile);
      expect(result).toBeNull();
    });
  });

  describe('getVariableId', () => {
    it('should identify variable declarations', () => {
      const code = `
        const myVariable = 'hello';
        let anotherVar = 42;
        var oldStyleVar = true;
      `;
      const sourceFile = createMockSourceFile(code, 'test.ts');
      
      const variableIds: (string | null)[] = [];
      
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isVariableStatement(node)) {
          node.declarationList.declarations.forEach((declaration) => {
            variableIds.push(getVariableId(declaration, sourceFile));
          });
        }
      });

      expect(variableIds).toContain('test.ts:myVariable');
      expect(variableIds).toContain('test.ts:anotherVar');
      expect(variableIds).toContain('test.ts:oldStyleVar');
    });

    it('should identify import specifiers', () => {
      const code = `
        import { namedImport } from 'some-module';
        import defaultImport from 'another-module';
      `;
      const sourceFile = createMockSourceFile(code, 'test.ts');
      
      const importIds: (string | null)[] = [];
      
      function visitNode(node: ts.Node) {
        if (ts.isImportSpecifier(node) || ts.isImportClause(node)) {
          importIds.push(getVariableId(node, sourceFile));
        }
        ts.forEachChild(node, visitNode);
      }
      
      visitNode(sourceFile);

      expect(importIds).toContain('test.ts:namedImport');
      expect(importIds).toContain('test.ts:defaultImport');
    });

    it('should return null for non-variable nodes', () => {
      const code = `
        function notAVariable() {
          return 'hello';
        }
      `;
      const sourceFile = createMockSourceFile(code, 'test.ts');
      
      let functionNode: ts.FunctionDeclaration | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isFunctionDeclaration(node)) {
          functionNode = node;
        }
      });

      expect(functionNode).toBeDefined();
      const result = getVariableId(functionNode!, sourceFile);
      expect(result).toBeNull();
    });
  });
});
