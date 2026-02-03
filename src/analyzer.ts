import path from 'path';
import ts from 'typescript';
import type { CallGraph, CallSite, FunctionInfo, LazyImport } from './types.js';

/**
 * Create TypeScript program from tsconfig
 */
export function createTsProgram(tsConfigPath = './tsconfig.json'): ts.Program {
  const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
  
  if (configFile.error) {
    throw new Error(`Failed to read tsconfig: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n')}`);
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(tsConfigPath)
  );

  if (parsedConfig.errors.length > 0) {
    const errors = parsedConfig.errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, '\n'));
    throw new Error(`TypeScript config errors:\n${errors.join('\n')}`);
  }

  return ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
}

/**
 * Extract lazy import module specifier from a lazy() call expression
 * Handles patterns like:
 * - lazy(() => import('./module'))
 * - lazy(() => import('@/features/widgets/broker-flow'))
 * - React.lazy(() => import('./module'))
 */
function extractLazyImport(callExpr: ts.CallExpression): string | null {
  // Check if it's a lazy() or React.lazy() call
  let isLazyCall = false;
  
  if (ts.isIdentifier(callExpr.expression) && callExpr.expression.text === 'lazy') {
    isLazyCall = true;
  } else if (ts.isPropertyAccessExpression(callExpr.expression)) {
    const exprText = callExpr.expression.getText();
    if (exprText === 'React.lazy' || exprText.endsWith('.lazy')) {
      isLazyCall = true;
    }
  }
  
  if (!isLazyCall || callExpr.arguments.length === 0) {
    return null;
  }
  
  const arg = callExpr.arguments[0];
  
  if (!arg) {
    return null;
  }
  
  // Check for arrow function: () => import(...)
  if (ts.isArrowFunction(arg) && arg.body) {
    let importCall: ts.CallExpression | undefined;
    
    // Direct: () => import('...')
    if (ts.isCallExpression(arg.body)) {
      importCall = arg.body;
    }
    // Block: () => { return import('...'); }
    else if (ts.isBlock(arg.body)) {
      // Look for return statement with import()
      const returnStmt = arg.body.statements.find(ts.isReturnStatement);
      if (returnStmt?.expression && ts.isCallExpression(returnStmt.expression)) {
        importCall = returnStmt.expression;
      }
    }
    
    if (importCall && importCall.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const moduleSpecifier = importCall.arguments[0];
      if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
        return moduleSpecifier.text;
      }
    }
  }
  
  return null;
}

/**
 * Get function ID from a node
 */
export function getFunctionId(node: ts.Node, sourceFile: ts.SourceFile): string | null {
  const relativePath = path.relative(process.cwd(), sourceFile.fileName);

  // Function declaration: function foo() {}
  if (ts.isFunctionDeclaration(node) && node.name) {
    return `${relativePath}:${node.name.text}`;
  }

  // Variable declaration with function: const foo = () => {}
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    let initializer = node.initializer;

    // Handle wrapped functions like React.memo(Component)
    if (initializer && ts.isCallExpression(initializer) && initializer.arguments[0]) {
      const firstArg = initializer.arguments[0];
      if (ts.isArrowFunction(firstArg) || ts.isFunctionExpression(firstArg)) {
        initializer = firstArg;
      }
    }

    if (initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) {
      return `${relativePath}:${node.name.text}`;
    }
  }

  // Method declaration: class Foo { bar() {} }
  if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
    return `${relativePath}:${node.name.text}`;
  }

  return null;
}

/**
 * Build call graph from TypeScript program
 */
export function buildCallGraph(program: ts.Program): CallGraph {
  const callGraph: CallGraph = new Map();
  const typeChecker = program.getTypeChecker();
  
  // Track lazy imports for second-pass resolution
  interface LazyImportRef {
    callerId: string;
    moduleSpecifier: string;
    line: number;
    sourceFile: ts.SourceFile;
  }
  const lazyImportRefs: LazyImportRef[] = [];

  function visit(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    currentFunctionId: string | null
  ) {
    let newCurrentFunctionId = currentFunctionId;

    // Register function in call graph
    const functionId = getFunctionId(node, sourceFile);
    if (functionId) {
      newCurrentFunctionId = functionId;
      if (!callGraph.has(functionId)) {
        const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        callGraph.set(functionId, {
          callers: [],
          definition: { startLine: start.line + 1, endLine: end.line + 1 },
        });
      }
    }

    // Helper to resolve symbol declaration
    const resolveDeclaration = (expr: ts.Node): ts.Declaration | undefined => {
      const symbol = typeChecker.getSymbolAtLocation(expr);
      if (!symbol) return undefined;
      if (symbol.flags & ts.SymbolFlags.Alias) {
        return typeChecker.getAliasedSymbol(symbol).getDeclarations()?.[0];
      }
      return symbol.getDeclarations()?.[0];
    };

    // Add caller to callee's call site list
    const recordCall = (calleeDecl: ts.Declaration, callNode: ts.Node, callerId: string) => {
      const calleeId = getFunctionId(calleeDecl, calleeDecl.getSourceFile());
      if (!calleeId) return;

      // Ensure callee exists in graph
      if (!callGraph.has(calleeId)) {
        const start = calleeDecl.getSourceFile().getLineAndCharacterOfPosition(calleeDecl.getStart());
        const end = calleeDecl.getSourceFile().getLineAndCharacterOfPosition(calleeDecl.getEnd());
        callGraph.set(calleeId, {
          callers: [],
          definition: { startLine: start.line + 1, endLine: end.line + 1 },
        });
      }

      const callee = callGraph.get(calleeId)!;
      const { line } = sourceFile.getLineAndCharacterOfPosition(callNode.getStart());
      const lineNumber = line + 1;

      // Avoid duplicates
      if (!callee.callers.some(c => c.callerId === callerId && c.line === lineNumber)) {
        callee.callers.push({ callerId, line: lineNumber });
      }
    };

    // Handle React.memo pattern
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer)) {
      const callExpr = node.initializer;
      const exprText = callExpr.expression.getText();
      if ((exprText === 'memo' || exprText === 'React.memo') && callExpr.arguments[0]) {
        const wrappedDecl = resolveDeclaration(callExpr.arguments[0]);
        const memoizedId = getFunctionId(node, sourceFile);
        if (wrappedDecl && memoizedId) {
          recordCall(wrappedDecl, node, memoizedId);
        }
      }
    }

    // Handle lazy imports: lazy(() => import('./module'))
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer)) {
      const callExpr = node.initializer;
      const modulePath = extractLazyImport(callExpr);
      
      if (modulePath) {
        const lazyComponentId = getFunctionId(node, sourceFile);
        if (lazyComponentId && callGraph.has(lazyComponentId)) {
          const funcInfo = callGraph.get(lazyComponentId)!;
          const { line } = sourceFile.getLineAndCharacterOfPosition(callExpr.getStart());
          
          if (!funcInfo.lazyImports) {
            funcInfo.lazyImports = [];
          }
          funcInfo.lazyImports.push({
            moduleSpecifier: modulePath,
            line: line + 1,
          });
          
          // Track for second-pass resolution
          lazyImportRefs.push({
            callerId: lazyComponentId,
            moduleSpecifier: modulePath,
            line: line + 1,
            sourceFile,
          });
        }
      }
    }

    // Record function calls and JSX usage
    if (currentFunctionId) {
      let calleeNode: ts.Node | undefined;

      if (ts.isCallExpression(node) && node.expression.kind !== ts.SyntaxKind.ImportKeyword) {
        calleeNode = node.expression;
      } else if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        calleeNode = node.tagName;
      }

      if (calleeNode) {
        const calleeDecl = resolveDeclaration(calleeNode);
        if (calleeDecl) {
          recordCall(calleeDecl, node, currentFunctionId);
        }
      }
    }

    ts.forEachChild(node, child => visit(child, sourceFile, newCurrentFunctionId));
  }

  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      visit(sourceFile, sourceFile, null);
    }
  }

  // Second pass: resolve lazy imports and create caller relationships
  const compilerOptions = program.getCompilerOptions();
  
  for (const lazyRef of lazyImportRefs) {
    // Resolve the module path using TypeScript's module resolution
    const resolved = ts.resolveModuleName(
      lazyRef.moduleSpecifier,
      lazyRef.sourceFile.fileName,
      compilerOptions,
      ts.sys
    );
    
    if (resolved.resolvedModule) {
      const resolvedPath = resolved.resolvedModule.resolvedFileName;
      const absoluteResolvedPath = path.resolve(resolvedPath);
      
      // Determine the directory to match
      // If resolved to index.ts/index.js, also match files in the same directory
      const absoluteResolvedDir = path.basename(resolvedPath).startsWith('index.')
        ? path.dirname(absoluteResolvedPath)
        : null;
      
      // Find all functions in the resolved module and add them to call graph
      for (const [funcId, funcInfo] of callGraph.entries()) {
        // Check if this function is from the lazy-loaded module
        const funcFile = funcId.split(':')[0];
        if (!funcFile) continue;
        
        const absoluteFuncPath = path.resolve(process.cwd(), funcFile);
        const funcDir = path.dirname(absoluteFuncPath);
        
        // Match if:
        // 1. The function is directly in the resolved file, OR
        // 2. The function is in the same directory as the resolved index file
        const isMatch = absoluteFuncPath === absoluteResolvedPath || 
                        (absoluteResolvedDir && funcDir === absoluteResolvedDir);
        
        if (isMatch) {
          // Add the lazy component as a caller of this function
          if (!funcInfo.callers.some(c => c.callerId === lazyRef.callerId && c.line === lazyRef.line)) {
            funcInfo.callers.push({
              callerId: lazyRef.callerId,
              line: lazyRef.line,
            });
          }
        }
      }
    }
  }

  return callGraph;
}

/**
 * Find functions that overlap with changed lines
 */
export function findChangedFunctions(
  callGraph: CallGraph,
  changedLinesByFile: Map<string, Set<number>>
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();

  for (const [functionId, info] of callGraph.entries()) {
    const [filePath] = functionId.split(':');
    if (!filePath) continue;

    const changedLines = changedLinesByFile.get(filePath);
    if (!changedLines) continue;

    for (const line of changedLines) {
      if (line >= info.definition.startLine && line <= info.definition.endLine) {
        if (!result.has(filePath)) {
          result.set(filePath, new Set());
        }
        result.get(filePath)!.add(functionId);
        break;
      }
    }
  }

  return result;
}
