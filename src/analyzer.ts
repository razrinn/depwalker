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

  // Track component aliases: variable -> component it references
  // e.g., const Widget = BrokerFlowWidget -> Map['Widget'] = 'BrokerFlowWidget'
  const componentAliases = new Map<string, string>();
  // Track by file to avoid cross-file collisions
  const fileComponentAliases = new Map<string, Map<string, string>>();
  // Track callback relationships: callback function -> parent function that owns it
  const callbackParents = new Map<string, string>();

  function visit(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    currentFunctionId: string | null,
    parentFunctionId: string | null = null
  ) {
    let newCurrentFunctionId = currentFunctionId;
    let newParentFunctionId = parentFunctionId;

    // Register function in call graph
    const functionId = getFunctionId(node, sourceFile);
    if (functionId) {
      newCurrentFunctionId = functionId;
      newParentFunctionId = parentFunctionId;
      if (!callGraph.has(functionId)) {
        const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        callGraph.set(functionId, {
          callers: [],
          definition: { startLine: start.line + 1, endLine: end.line + 1 },
        });
      }
      
      // If this function has a parent (e.g., callback passed to useMemo), record it
      if (parentFunctionId) {
        callbackParents.set(functionId, parentFunctionId);
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

    // Get the ultimate parent function for callbacks
    // If callerId is a callback (e.g., useMemo callback), trace up to the parent function
    const getUltimateCaller = (callerId: string): string => {
      let current = callerId;
      const visited = new Set<string>();
      while (callbackParents.has(current) && !visited.has(current)) {
        visited.add(current);
        current = callbackParents.get(current)!;
      }
      return current;
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

      // Resolve callback to ultimate parent (e.g., useMemo callback -> ContentItem)
      const ultimateCallerId = getUltimateCaller(callerId);

      // Avoid duplicates
      if (!callee.callers.some(c => c.callerId === ultimateCallerId && c.line === lineNumber)) {
        callee.callers.push({ callerId: ultimateCallerId, line: lineNumber });
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

    // Track component aliases: const Widget = SomeComponent
    // This handles patterns like lazy-loaded components assigned to variables
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isIdentifier(node.name)) {
      const aliasName = node.name.text;
      let targetComponent: string | null = null;

      // Direct assignment: const Widget = SomeComponent
      if (ts.isIdentifier(node.initializer)) {
        targetComponent = node.initializer.text;
      }
      // Property access: const Widget = components.SomeComponent
      else if (ts.isPropertyAccessExpression(node.initializer) && ts.isIdentifier(node.initializer.name)) {
        targetComponent = node.initializer.name.text;
      }
      // Lazy loaded: const Widget = lazy(() => import('./Component'))
      else if (ts.isCallExpression(node.initializer)) {
        const callExpr = node.initializer;
        const exprText = callExpr.expression.getText();
        if ((exprText === 'lazy' || exprText === 'React.lazy') && callExpr.arguments[0]) {
          // For lazy imports, we'll resolve the actual component in the second pass
          // For now, just mark it as a lazy alias
          const arg = callExpr.arguments[0];
          if (ts.isArrowFunction(arg) && arg.body) {
            // Store for later resolution
            const filePath = path.relative(process.cwd(), sourceFile.fileName);
            if (!fileComponentAliases.has(filePath)) {
              fileComponentAliases.set(filePath, new Map());
            }
            fileComponentAliases.get(filePath)!.set(aliasName, '__LAZY__');
          }
        }
      }

      // Store the alias mapping
      if (targetComponent) {
        const filePath = path.relative(process.cwd(), sourceFile.fileName);
        if (!fileComponentAliases.has(filePath)) {
          fileComponentAliases.set(filePath, new Map());
        }
        fileComponentAliases.get(filePath)!.set(aliasName, targetComponent);

        // Also register the alias in call graph and link it as a caller of the target
        // This enables the tree to show: Target -> Alias -> Alias's callers
        const aliasId = `${filePath}:${aliasName}`;
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.name.getStart());
        
        if (!callGraph.has(aliasId)) {
          callGraph.set(aliasId, {
            callers: [],
            definition: { startLine: line + 1, endLine: line + 1 },
          });
        }
        
        // Find the target component and add alias as its caller
        for (const [funcId, funcInfo] of callGraph.entries()) {
          const funcName = funcId.split(':')[1];
          if (funcName === targetComponent) {
            // Alias is a "caller" of the target (represents the assignment)
            if (!funcInfo.callers.some(c => c.callerId === aliasId)) {
              funcInfo.callers.push({
                callerId: aliasId,
                line: line + 1,
              });
            }
            break;
          }
        }
      }
    }

    // Track object property assignments: const widgets = { flow: SomeComponent }
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
      const propName = node.name.text;
      if (ts.isIdentifier(node.initializer)) {
        const targetComponent = node.initializer.text;
        const filePath = path.relative(process.cwd(), sourceFile.fileName);
        if (!fileComponentAliases.has(filePath)) {
          fileComponentAliases.set(filePath, new Map());
        }
        // Store with property path notation: widgets.flow
        // We'll need parent info to get the object name, handled below
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

      // Handle JSX expression containers: {variable}
      // This tracks when a React element stored in a variable is rendered
      if (ts.isJsxExpression(node) && node.expression && ts.isIdentifier(node.expression)) {
        const varName = node.expression.text;
        const filePath = path.relative(process.cwd(), sourceFile.fileName);
        const varId = `${filePath}:${varName}`;
        
        // If this variable is tracked in our call graph (e.g., widgetComponent from useMemo)
        if (callGraph.has(varId)) {
          const funcInfo = callGraph.get(varId)!;
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          const ultimateCaller = getUltimateCaller(currentFunctionId);
          if (!funcInfo.callers.some(c => c.callerId === ultimateCaller && c.line === line + 1)) {
            funcInfo.callers.push({
              callerId: ultimateCaller,
              line: line + 1,
            });
          }
        }
      }

      if (calleeNode) {
        const filePath = path.relative(process.cwd(), sourceFile.fileName);
        let isAlias = false;
        
        // Check if this is a component alias first
        // If so, route the call through the alias instead of directly to the target
        if (ts.isIdentifier(calleeNode)) {
          const aliases = fileComponentAliases.get(filePath);
          const aliasTarget = aliases?.get(calleeNode.text);
          
          if (aliasTarget && aliasTarget !== '__LAZY__') {
            isAlias = true;
            // Record call on the alias, not the original component
            const aliasId = `${filePath}:${calleeNode.text}`;
            if (!callGraph.has(aliasId)) {
              const { line } = sourceFile.getLineAndCharacterOfPosition(calleeNode.getStart());
              callGraph.set(aliasId, {
                callers: [],
                definition: { startLine: line + 1, endLine: line + 1 },
              });
            }
            const aliasFuncInfo = callGraph.get(aliasId)!;
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            const ultimateCaller = currentFunctionId ? getUltimateCaller(currentFunctionId) : currentFunctionId;
            if (!aliasFuncInfo.callers.some(c => c.callerId === ultimateCaller && c.line === line + 1)) {
              aliasFuncInfo.callers.push({
                callerId: ultimateCaller!,
                line: line + 1,
              });
            }
          }
        }
        
        // Normal resolution for non-alias callees
        if (!isAlias) {
          const calleeDecl = resolveDeclaration(calleeNode);
          if (calleeDecl) {
            recordCall(calleeDecl, node, currentFunctionId);
          } else if (ts.isIdentifier(calleeNode)) {
            // Try to find declaration through TypeScript's type checker
            const symbol = typeChecker.getSymbolAtLocation(calleeNode);
            if (symbol) {
              const decls = symbol.getDeclarations();
              if (decls && decls.length > 0) {
                const decl = decls[0];
                if (decl) {
                  const declId = getFunctionId(decl, decl.getSourceFile());
                  if (declId) {
                    // It's a function/component - record the call
                    if (!callGraph.has(declId)) {
                      const declSourceFile = decl.getSourceFile();
                      const start = declSourceFile.getLineAndCharacterOfPosition(decl.getStart());
                      const end = declSourceFile.getLineAndCharacterOfPosition(decl.getEnd());
                      callGraph.set(declId, {
                        callers: [],
                        definition: { startLine: start.line + 1, endLine: end.line + 1 },
                        lazyImports: [],
                      });
                    }
                    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                    const funcInfo = callGraph.get(declId)!;
                    const ultimateCaller = currentFunctionId ? getUltimateCaller(currentFunctionId) : currentFunctionId;
                    if (!funcInfo.callers.some(c => c.callerId === ultimateCaller && c.line === line + 1)) {
                      funcInfo.callers.push({
                        callerId: ultimateCaller!,
                        line: line + 1,
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Track callbacks passed as arguments (e.g., useMemo(() => {}, []))
    // so we can link them to their parent function
    if (currentFunctionId && (ts.isArrowFunction(node) || ts.isFunctionExpression(node))) {
      // Check if this function is passed as an argument to a call expression
      const parent = node.parent;
      if (parent && ts.isCallExpression(parent)) {
        // This is a callback passed directly to a call - the currentFunctionId is the parent
        callbackParents.set(newCurrentFunctionId || '', currentFunctionId);
      } else if (parent && ts.isArrayLiteralExpression(parent)) {
        // Check if this array is passed as an argument (e.g., dependency array)
        const grandparent = parent.parent;
        if (grandparent && ts.isCallExpression(grandparent)) {
          callbackParents.set(newCurrentFunctionId || '', currentFunctionId);
        }
      }
    }

    ts.forEachChild(node, child => visit(child, sourceFile, newCurrentFunctionId, newParentFunctionId));
  }

  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      visit(sourceFile, sourceFile, null, null);
    }
  }

  // Second pass: resolve lazy imports and create caller relationships
  const compilerOptions = program.getCompilerOptions();
  
  for (const lazyRef of lazyImportRefs) {
    // Resolve the module path using TypeScript's module resolution
    // Use absolute path for the containing file to ensure resolution works
    const containingFile = path.resolve(lazyRef.sourceFile.fileName);
    const resolved = ts.resolveModuleName(
      lazyRef.moduleSpecifier,
      containingFile,
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
