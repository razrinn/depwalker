import path from 'path';
import ts from 'typescript';
import type { CallGraph, CallSite, FunctionInfo, LazyImport, NodeKind } from './types.js';
import { LAZY_IMPORT_SENTINEL } from './constants.js';

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

// ---------------------------------------------------------------------------
// Node identification
// ---------------------------------------------------------------------------

interface NodeIdentification {
  id: string;
  kind: NodeKind;
}

/**
 * Walk up the AST to find enclosing class name
 */
function getParentClassName(node: ts.Node): string | null {
  let current = node.parent;
  while (current) {
    if (ts.isClassDeclaration(current) && current.name) {
      return current.name.text;
    }
    current = current.parent;
  }
  return null;
}

/**
 * Check if a variable declaration is at module level or exported (worth tracking).
 * Skips local variables inside functions/blocks to avoid noise.
 */
function isTrackableVariable(node: ts.VariableDeclaration): boolean {
  // Walk up to find the VariableStatement (which holds modifiers)
  const varDeclList = node.parent;
  if (!varDeclList || !ts.isVariableDeclarationList(varDeclList)) return false;
  const varStatement = varDeclList.parent;
  if (!varStatement) return false;

  // If exported, always track
  if (ts.isVariableStatement(varStatement) && varStatement.modifiers?.some(
    m => m.kind === ts.SyntaxKind.ExportKeyword
  )) {
    return true;
  }

  // If at source file level, track
  if (ts.isVariableStatement(varStatement) && ts.isSourceFile(varStatement.parent)) {
    return true;
  }

  return false;
}

/**
 * Check if an initializer is a function-like expression
 */
function isFunctionLikeInitializer(init: ts.Expression): boolean {
  if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) return true;
  // Wrapped functions like React.memo(Component)
  if (ts.isCallExpression(init) && init.arguments[0]) {
    const firstArg = init.arguments[0];
    if (ts.isArrowFunction(firstArg) || ts.isFunctionExpression(firstArg)) return true;
  }
  return false;
}

/**
 * Get node ID and kind from an AST node. Returns null if the node is not trackable.
 */
export function getNodeId(node: ts.Node, sourceFile: ts.SourceFile): NodeIdentification | null {
  const relativePath = path.relative(process.cwd(), sourceFile.fileName);

  // Function declaration: function foo() {}
  if (ts.isFunctionDeclaration(node) && node.name) {
    return { id: `${relativePath}:${node.name.text}`, kind: 'function' };
  }

  // Variable declaration: const foo = ...
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    const initializer = node.initializer;

    if (initializer && isFunctionLikeInitializer(initializer)) {
      return { id: `${relativePath}:${node.name.text}`, kind: 'function' };
    }

    // Non-function variable — only track if module-level or exported
    if (initializer && isTrackableVariable(node)) {
      return { id: `${relativePath}:${node.name.text}`, kind: 'variable' };
    }
  }

  // Method declaration: class Foo { bar() {} }
  if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
    return { id: `${relativePath}:${node.name.text}`, kind: 'method' };
  }

  // Constructor declaration: class Foo { constructor() {} }
  if (ts.isConstructorDeclaration(node)) {
    const className = getParentClassName(node);
    if (className) {
      return { id: `${relativePath}:${className}.constructor`, kind: 'constructor' };
    }
  }

  // Getter: class Foo { get bar() {} }
  if (ts.isGetAccessorDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
    return { id: `${relativePath}:get ${node.name.text}`, kind: 'accessor' };
  }

  // Setter: class Foo { set bar(v) {} }
  if (ts.isSetAccessorDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
    return { id: `${relativePath}:set ${node.name.text}`, kind: 'accessor' };
  }

  // Class declaration: class Foo {}
  if (ts.isClassDeclaration(node) && node.name) {
    return { id: `${relativePath}:${node.name.text}`, kind: 'class' };
  }

  // Class property declaration: class Foo { bar = ... }
  if (ts.isPropertyDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
    if (node.initializer && isFunctionLikeInitializer(node.initializer)) {
      return { id: `${relativePath}:${node.name.text}`, kind: 'function' };
    }
    if (node.initializer) {
      return { id: `${relativePath}:${node.name.text}`, kind: 'class-property' };
    }
  }

  // Enum declaration: enum Foo {}
  if (ts.isEnumDeclaration(node)) {
    return { id: `${relativePath}:${node.name.text}`, kind: 'enum' };
  }

  return null;
}

/**
 * Get function ID from a node (backward-compatible wrapper around getNodeId)
 */
export function getFunctionId(node: ts.Node, sourceFile: ts.SourceFile): string | null {
  return getNodeId(node, sourceFile)?.id ?? null;
}

// ---------------------------------------------------------------------------
// Lazy import extraction
// ---------------------------------------------------------------------------

/**
 * Extract lazy import module specifier from a lazy() call expression
 * Handles: lazy(() => import('./module')), React.lazy(() => import('./module'))
 */
function extractLazyImport(callExpr: ts.CallExpression): string | null {
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
  if (!arg) return null;

  if (ts.isArrowFunction(arg) && arg.body) {
    let importCall: ts.CallExpression | undefined;

    if (ts.isCallExpression(arg.body)) {
      importCall = arg.body;
    } else if (ts.isBlock(arg.body)) {
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

// ---------------------------------------------------------------------------
// Build context — shared state for graph construction
// ---------------------------------------------------------------------------

interface LazyImportRef {
  callerId: string;
  moduleSpecifier: string;
  line: number;
  sourceFile: ts.SourceFile;
}

interface BuildContext {
  callGraph: CallGraph;
  typeChecker: ts.TypeChecker;
  lazyImportRefs: LazyImportRef[];
  fileComponentAliases: Map<string, Map<string, string>>;
  callbackParents: Map<string, string>;
}

// ---------------------------------------------------------------------------
// Graph construction helpers (module-internal)
// ---------------------------------------------------------------------------

/** Kinds that represent executable scopes (can contain call expressions) */
function isFunctionLikeKind(kind: NodeKind): boolean {
  return kind === 'function' || kind === 'method' || kind === 'constructor' || kind === 'accessor';
}

/** Register a node in the call graph */
function registerNode(
  ctx: BuildContext,
  nodeId: string,
  kind: NodeKind,
  node: ts.Node,
  sourceFile: ts.SourceFile,
  parentFunctionId: string | null
): void {
  if (!ctx.callGraph.has(nodeId)) {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    ctx.callGraph.set(nodeId, {
      callers: [],
      definition: { startLine: start.line + 1, endLine: end.line + 1 },
      kind,
    });
  }

  // If this function has a parent (e.g., callback passed to useMemo), record it
  if (parentFunctionId) {
    ctx.callbackParents.set(nodeId, parentFunctionId);
  }
}

/** Resolve a symbol to its declaration */
function resolveDeclaration(ctx: BuildContext, expr: ts.Node): ts.Declaration | undefined {
  const symbol = ctx.typeChecker.getSymbolAtLocation(expr);
  if (!symbol) return undefined;
  if (symbol.flags & ts.SymbolFlags.Alias) {
    return ctx.typeChecker.getAliasedSymbol(symbol).getDeclarations()?.[0];
  }
  return symbol.getDeclarations()?.[0];
}

/** Trace callback parent chain to the ultimate containing function */
function getUltimateCaller(ctx: BuildContext, callerId: string): string {
  let current = callerId;
  const visited = new Set<string>();
  while (ctx.callbackParents.has(current) && !visited.has(current)) {
    visited.add(current);
    current = ctx.callbackParents.get(current)!;
  }
  return current;
}

/** Add a caller relationship from callerId to callee's call site list */
function recordCall(
  ctx: BuildContext,
  calleeDecl: ts.Declaration,
  callNode: ts.Node,
  callerId: string,
  sourceFile: ts.SourceFile,
): void {
  const nodeInfo = getNodeId(calleeDecl, calleeDecl.getSourceFile());
  if (!nodeInfo) return;

  const calleeId = nodeInfo.id;

  // Ensure callee exists in graph
  if (!ctx.callGraph.has(calleeId)) {
    const declSf = calleeDecl.getSourceFile();
    const start = declSf.getLineAndCharacterOfPosition(calleeDecl.getStart());
    const end = declSf.getLineAndCharacterOfPosition(calleeDecl.getEnd());
    ctx.callGraph.set(calleeId, {
      callers: [],
      definition: { startLine: start.line + 1, endLine: end.line + 1 },
      kind: nodeInfo.kind,
    });
  }

  const callee = ctx.callGraph.get(calleeId)!;
  const { line } = sourceFile.getLineAndCharacterOfPosition(callNode.getStart());
  const lineNumber = line + 1;
  const ultimateCallerId = getUltimateCaller(ctx, callerId);

  if (!callee.callers.some(c => c.callerId === ultimateCallerId && c.line === lineNumber)) {
    callee.callers.push({ callerId: ultimateCallerId, line: lineNumber });
  }
}

/** Handle React.memo() wrapping pattern */
function handleReactMemo(
  ctx: BuildContext,
  node: ts.VariableDeclaration,
  sourceFile: ts.SourceFile,
): void {
  if (!node.initializer || !ts.isCallExpression(node.initializer)) return;
  const callExpr = node.initializer;
  const exprText = callExpr.expression.getText();
  if ((exprText === 'memo' || exprText === 'React.memo') && callExpr.arguments[0]) {
    const wrappedDecl = resolveDeclaration(ctx, callExpr.arguments[0]);
    const memoizedId = getFunctionId(node, sourceFile);
    if (wrappedDecl && memoizedId) {
      recordCall(ctx, wrappedDecl, node, memoizedId, sourceFile);
    }
  }
}

/** Track component aliases (const Widget = SomeComponent) */
function trackComponentAlias(
  ctx: BuildContext,
  node: ts.VariableDeclaration,
  sourceFile: ts.SourceFile,
): void {
  if (!node.initializer || !ts.isIdentifier(node.name)) return;

  const aliasName = node.name.text;
  let targetComponent: string | null = null;

  if (ts.isIdentifier(node.initializer)) {
    targetComponent = node.initializer.text;
  } else if (ts.isPropertyAccessExpression(node.initializer) && ts.isIdentifier(node.initializer.name)) {
    targetComponent = node.initializer.name.text;
  } else if (ts.isCallExpression(node.initializer)) {
    const callExpr = node.initializer;
    const exprText = callExpr.expression.getText();
    if ((exprText === 'lazy' || exprText === 'React.lazy') && callExpr.arguments[0]) {
      const arg = callExpr.arguments[0];
      if (ts.isArrowFunction(arg) && arg.body) {
        const filePath = path.relative(process.cwd(), sourceFile.fileName);
        if (!ctx.fileComponentAliases.has(filePath)) {
          ctx.fileComponentAliases.set(filePath, new Map());
        }
        ctx.fileComponentAliases.get(filePath)!.set(aliasName, LAZY_IMPORT_SENTINEL);
      }
    }
  }

  if (targetComponent) {
    const filePath = path.relative(process.cwd(), sourceFile.fileName);
    if (!ctx.fileComponentAliases.has(filePath)) {
      ctx.fileComponentAliases.set(filePath, new Map());
    }
    ctx.fileComponentAliases.get(filePath)!.set(aliasName, targetComponent);

    const aliasId = `${filePath}:${aliasName}`;
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.name.getStart());

    if (!ctx.callGraph.has(aliasId)) {
      ctx.callGraph.set(aliasId, {
        callers: [],
        definition: { startLine: line + 1, endLine: line + 1 },
      });
    }

    for (const [funcId, funcInfo] of ctx.callGraph.entries()) {
      const funcName = funcId.split(':')[1];
      if (funcName === targetComponent) {
        if (!funcInfo.callers.some(c => c.callerId === aliasId)) {
          funcInfo.callers.push({ callerId: aliasId, line: line + 1 });
        }
        break;
      }
    }
  }
}

/** Handle lazy(() => import('./module')) declarations */
function handleLazyImportDeclaration(
  ctx: BuildContext,
  node: ts.VariableDeclaration,
  sourceFile: ts.SourceFile,
): void {
  if (!node.initializer || !ts.isCallExpression(node.initializer)) return;
  const callExpr = node.initializer;
  const modulePath = extractLazyImport(callExpr);

  if (modulePath) {
    const lazyComponentId = getFunctionId(node, sourceFile);
    if (lazyComponentId && ctx.callGraph.has(lazyComponentId)) {
      const funcInfo = ctx.callGraph.get(lazyComponentId)!;
      const { line } = sourceFile.getLineAndCharacterOfPosition(callExpr.getStart());

      if (!funcInfo.lazyImports) {
        funcInfo.lazyImports = [];
      }
      funcInfo.lazyImports.push({ moduleSpecifier: modulePath, line: line + 1 });

      ctx.lazyImportRefs.push({
        callerId: lazyComponentId,
        moduleSpecifier: modulePath,
        line: line + 1,
        sourceFile,
      });
    }
  }
}

/** Record a call expression from currentFunctionId to the callee */
function recordCallExpression(
  ctx: BuildContext,
  node: ts.Node,
  calleeNode: ts.Node,
  currentFunctionId: string,
  sourceFile: ts.SourceFile,
): void {
  const filePath = path.relative(process.cwd(), sourceFile.fileName);
  let isAlias = false;

  if (ts.isIdentifier(calleeNode)) {
    const aliases = ctx.fileComponentAliases.get(filePath);
    const aliasTarget = aliases?.get(calleeNode.text);

    if (aliasTarget && aliasTarget !== LAZY_IMPORT_SENTINEL) {
      isAlias = true;
      const aliasId = `${filePath}:${calleeNode.text}`;
      if (!ctx.callGraph.has(aliasId)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(calleeNode.getStart());
        ctx.callGraph.set(aliasId, {
          callers: [],
          definition: { startLine: line + 1, endLine: line + 1 },
        });
      }
      const aliasFuncInfo = ctx.callGraph.get(aliasId)!;
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      const ultimateCaller = getUltimateCaller(ctx, currentFunctionId);
      if (!aliasFuncInfo.callers.some(c => c.callerId === ultimateCaller && c.line === line + 1)) {
        aliasFuncInfo.callers.push({ callerId: ultimateCaller, line: line + 1 });
      }
    }
  }

  if (!isAlias) {
    const calleeDecl = resolveDeclaration(ctx, calleeNode);
    if (calleeDecl) {
      recordCall(ctx, calleeDecl, node, currentFunctionId, sourceFile);
    } else if (ts.isIdentifier(calleeNode)) {
      const symbol = ctx.typeChecker.getSymbolAtLocation(calleeNode);
      if (symbol) {
        const decls = symbol.getDeclarations();
        if (decls && decls.length > 0) {
          const decl = decls[0];
          if (decl) {
            const nodeInfo = getNodeId(decl, decl.getSourceFile());
            if (nodeInfo) {
              if (!ctx.callGraph.has(nodeInfo.id)) {
                const declSourceFile = decl.getSourceFile();
                const start = declSourceFile.getLineAndCharacterOfPosition(decl.getStart());
                const end = declSourceFile.getLineAndCharacterOfPosition(decl.getEnd());
                ctx.callGraph.set(nodeInfo.id, {
                  callers: [],
                  definition: { startLine: start.line + 1, endLine: end.line + 1 },
                  kind: nodeInfo.kind,
                  lazyImports: [],
                });
              }
              const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
              const funcInfo = ctx.callGraph.get(nodeInfo.id)!;
              const ultimateCaller = getUltimateCaller(ctx, currentFunctionId);
              if (!funcInfo.callers.some(c => c.callerId === ultimateCaller && c.line === line + 1)) {
                funcInfo.callers.push({ callerId: ultimateCaller, line: line + 1 });
              }
            }
          }
        }
      }
    }
  }
}

/** Track callbacks passed as arguments (e.g., useMemo(() => {}, [])) */
function trackCallbackParent(
  ctx: BuildContext,
  node: ts.Node,
  currentFunctionId: string,
  newCurrentFunctionId: string | null,
): void {
  if (!(ts.isArrowFunction(node) || ts.isFunctionExpression(node))) return;
  const parent = node.parent;
  if (parent && ts.isCallExpression(parent)) {
    ctx.callbackParents.set(newCurrentFunctionId || '', currentFunctionId);
  } else if (parent && ts.isArrayLiteralExpression(parent)) {
    const grandparent = parent.parent;
    if (grandparent && ts.isCallExpression(grandparent)) {
      ctx.callbackParents.set(newCurrentFunctionId || '', currentFunctionId);
    }
  }
}

/**
 * Check if an identifier is a reference usage (not a declaration, import, property access name, or type-only)
 */
function isReferenceIdentifier(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) return false;

  // Skip declaration names (the `X` in `const X = ...`, `function X`, `class X`, `enum X`)
  if (ts.isVariableDeclaration(parent) && parent.name === node) return false;
  if (ts.isFunctionDeclaration(parent) && parent.name === node) return false;
  if (ts.isClassDeclaration(parent) && parent.name === node) return false;
  if (ts.isEnumDeclaration(parent) && parent.name === node) return false;
  if (ts.isMethodDeclaration(parent) && parent.name === node) return false;
  if (ts.isPropertyDeclaration(parent) && parent.name === node) return false;
  if (ts.isParameter(parent) && parent.name === node) return false;
  if (ts.isGetAccessorDeclaration(parent) && parent.name === node) return false;
  if (ts.isSetAccessorDeclaration(parent) && parent.name === node) return false;

  // Skip import specifiers
  if (ts.isImportSpecifier(parent)) return false;
  if (ts.isImportClause(parent)) return false;
  if (ts.isNamespaceImport(parent)) return false;

  // Skip property access names (the `x` in `obj.x`)
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;

  // Skip property assignment names (the `x` in `{ x: value }`)
  if (ts.isPropertyAssignment(parent) && parent.name === node) return false;

  // Skip shorthand property names used as declarations (the `x` in `const { x } = obj`)
  if (ts.isBindingElement(parent) && parent.name === node) return false;

  // Skip type references — only available in certain contexts
  if (ts.isTypeReferenceNode(parent)) return false;
  if (ts.isExpressionWithTypeArguments(parent)) return false;

  // Skip export specifiers (the name in `export { X }`)
  if (ts.isExportSpecifier(parent)) return false;

  return true;
}

/**
 * Track identifier references to variables, enums, and classes.
 * When inside a function and we encounter an identifier that resolves to a tracked
 * non-function node, record a caller relationship.
 */
function trackIdentifierReference(
  ctx: BuildContext,
  node: ts.Identifier,
  currentFunctionId: string,
  sourceFile: ts.SourceFile,
): void {
  if (!isReferenceIdentifier(node)) return;

  // Skip if this identifier is the callee of a call expression (already handled by recordCallExpression)
  const parent = node.parent;
  if (parent && ts.isCallExpression(parent) && parent.expression === node) return;

  // Also skip JSX tag names (already handled)
  if (parent && (ts.isJsxOpeningElement(parent) || ts.isJsxSelfClosingElement(parent)) && parent.tagName === node) return;

  const decl = resolveDeclaration(ctx, node);
  if (!decl) return;

  const nodeInfo = getNodeId(decl, decl.getSourceFile());
  if (!nodeInfo) return;

  // Only track references to non-function-like nodes (variables, enums, classes, class-properties)
  // Function calls are already handled by the call expression tracking
  if (isFunctionLikeKind(nodeInfo.kind)) return;

  // Ensure the target exists in the graph
  if (!ctx.callGraph.has(nodeInfo.id)) {
    const declSf = decl.getSourceFile();
    const start = declSf.getLineAndCharacterOfPosition(decl.getStart());
    const end = declSf.getLineAndCharacterOfPosition(decl.getEnd());
    ctx.callGraph.set(nodeInfo.id, {
      callers: [],
      definition: { startLine: start.line + 1, endLine: end.line + 1 },
      kind: nodeInfo.kind,
    });
  }

  const targetInfo = ctx.callGraph.get(nodeInfo.id)!;
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  const lineNumber = line + 1;
  const ultimateCallerId = getUltimateCaller(ctx, currentFunctionId);

  if (!targetInfo.callers.some(c => c.callerId === ultimateCallerId && c.line === lineNumber)) {
    targetInfo.callers.push({ callerId: ultimateCallerId, line: lineNumber });
  }
}

/** Resolve lazy imports in second pass and create caller relationships */
function resolveLazyImports(ctx: BuildContext, program: ts.Program): void {
  const compilerOptions = program.getCompilerOptions();

  for (const lazyRef of ctx.lazyImportRefs) {
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
      const absoluteResolvedDir = path.basename(resolvedPath).startsWith('index.')
        ? path.dirname(absoluteResolvedPath)
        : null;

      for (const [funcId, funcInfo] of ctx.callGraph.entries()) {
        const funcFile = funcId.split(':')[0];
        if (!funcFile) continue;

        const absoluteFuncPath = path.resolve(process.cwd(), funcFile);
        const funcDir = path.dirname(absoluteFuncPath);

        const isMatch = absoluteFuncPath === absoluteResolvedPath ||
                        (absoluteResolvedDir && funcDir === absoluteResolvedDir);

        if (isMatch) {
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
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build call graph from TypeScript program
 */
export function buildCallGraph(program: ts.Program): CallGraph {
  const ctx: BuildContext = {
    callGraph: new Map(),
    typeChecker: program.getTypeChecker(),
    lazyImportRefs: [],
    fileComponentAliases: new Map(),
    callbackParents: new Map(),
  };

  function visit(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    currentFunctionId: string | null,
    parentFunctionId: string | null = null
  ) {
    let newCurrentFunctionId = currentFunctionId;
    let newParentFunctionId = parentFunctionId;

    // Register node in call graph
    const nodeInfo = getNodeId(node, sourceFile);
    if (nodeInfo) {
      registerNode(ctx, nodeInfo.id, nodeInfo.kind, node, sourceFile, parentFunctionId);

      // Only update currentFunctionId context for function-like kinds
      // Variables/enums/classes don't "contain" call expressions we want to attribute
      if (isFunctionLikeKind(nodeInfo.kind)) {
        newCurrentFunctionId = nodeInfo.id;
        newParentFunctionId = parentFunctionId;
      }
    }

    // Handle VariableDeclaration-specific patterns
    if (ts.isVariableDeclaration(node)) {
      handleReactMemo(ctx, node, sourceFile);
      trackComponentAlias(ctx, node, sourceFile);
      handleLazyImportDeclaration(ctx, node, sourceFile);
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
      if (ts.isJsxExpression(node) && node.expression && ts.isIdentifier(node.expression)) {
        const varName = node.expression.text;
        const filePath = path.relative(process.cwd(), sourceFile.fileName);
        const varId = `${filePath}:${varName}`;

        if (ctx.callGraph.has(varId)) {
          const funcInfo = ctx.callGraph.get(varId)!;
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          const ultimateCaller = getUltimateCaller(ctx, currentFunctionId);
          if (!funcInfo.callers.some(c => c.callerId === ultimateCaller && c.line === line + 1)) {
            funcInfo.callers.push({ callerId: ultimateCaller, line: line + 1 });
          }
        }
      }

      if (calleeNode) {
        recordCallExpression(ctx, node, calleeNode, currentFunctionId, sourceFile);
      }

      // Track identifier references to non-function nodes (variables, enums, classes)
      if (ts.isIdentifier(node)) {
        trackIdentifierReference(ctx, node, currentFunctionId, sourceFile);
      }
    }

    // Track callbacks passed as arguments
    if (currentFunctionId && (ts.isArrowFunction(node) || ts.isFunctionExpression(node))) {
      trackCallbackParent(ctx, node, currentFunctionId, newCurrentFunctionId);
    }

    ts.forEachChild(node, child => visit(child, sourceFile, newCurrentFunctionId, newParentFunctionId));
  }

  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      visit(sourceFile, sourceFile, null, null);
    }
  }

  // Second pass: resolve lazy imports
  resolveLazyImports(ctx, program);

  return ctx.callGraph;
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
