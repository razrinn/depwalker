import { execSync } from 'child_process';
import path from 'path';
import ts from 'typescript';

// Types
export interface CallSite {
  callerId: string;
  line: number;
}

export interface FunctionInfo {
  callers: CallSite[];
  definition: { startLine: number; endLine: number };
}

export type CallGraph = Map<string, FunctionInfo>;

// Variable-related types
export interface VariableUsage {
  userId: string; // Function or variable that uses this variable
  line: number;
  usageType: 'read' | 'write' | 'reference';
}

export interface VariableInfo {
  usages: VariableUsage[];
  definition: { startLine: number; endLine: number };
  type: 'const' | 'let' | 'var' | 'import' | 'export' | 'parameter';
  scope: 'global' | 'module' | 'function' | 'block';
}

export type VariableGraph = Map<string, VariableInfo>;

export interface AnalysisResult {
  changedFiles: string[];
  changedFunctions: Map<string, Set<string>>;
  callGraph: CallGraph;
  changedVariables?: Map<string, Set<string>>;
  variableGraph?: VariableGraph;
}

// Utility functions
export function truncatePath(filePath: string, numDirs = 3): string {
  const parts = filePath.split(path.sep);
  const partsToShow = numDirs + 1;
  if (parts.length > partsToShow) {
    const sliced = parts.slice(-partsToShow);
    return ['...', ...sliced].join(path.sep);
  }
  return filePath;
}

// Git functions
export function getGitDiff(): string {
  return execSync('git diff -U0 HEAD').toString();
}

export function parseGitDiff(diffOutput: string): Map<string, Set<number>> {
  const changedLines = new Map<string, Set<number>>();
  let currentFile: string | null = null;
  const fileRegex = /^--- a\/(.*)$/;
  const hunkRegex = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;

  for (const line of diffOutput.split('\n')) {
    const fileMatch = line.match(fileRegex);
    if (fileMatch && fileMatch[1]) {
      const fileName = fileMatch[1];
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

    if (currentFile) {
      const hunkMatch = line.match(hunkRegex);
      if (hunkMatch && hunkMatch[1]) {
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

// TypeScript analysis
export function createTsProgram(tsConfigPath = './tsconfig.json'): ts.Program {
  try {
    const tsConfigFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);

    if (tsConfigFile.error) {
      throw new Error(
        `Failed to read tsconfig file at ${tsConfigPath}: ${ts.formatDiagnostic(
          tsConfigFile.error,
          {
            getCanonicalFileName: (fileName) => fileName,
            getCurrentDirectory: ts.sys.getCurrentDirectory,
            getNewLine: () => ts.sys.newLine,
          }
        )}`
      );
    }

    const parsedTsConfig = ts.parseJsonConfigFileContent(
      tsConfigFile.config,
      ts.sys,
      path.dirname(tsConfigPath)
    );

    if (parsedTsConfig.errors.length > 0) {
      const errorMessages = parsedTsConfig.errors
        .map((error) =>
          ts.formatDiagnostic(error, {
            getCanonicalFileName: (fileName) => fileName,
            getCurrentDirectory: ts.sys.getCurrentDirectory,
            getNewLine: () => ts.sys.newLine,
          })
        )
        .join('\n');
      throw new Error(`TypeScript configuration errors:\n${errorMessages}`);
    }

    return ts.createProgram(parsedTsConfig.fileNames, parsedTsConfig.options);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to create TypeScript program: ${String(error)}`);
  }
}

export function getFunctionId(
  node: ts.Node,
  sourceFile: ts.SourceFile
): string | null {
  const relativePath = path.relative(process.cwd(), sourceFile.fileName);

  // Function declarations
  if (ts.isFunctionDeclaration(node) && node.name) {
    return `${relativePath}:${node.name.text}`;
  }

  // Variable declarations that hold functions (arrow functions, function expressions)
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    let initializer = node.initializer;

    // Handle wrapped functions like React.memo(component)
    if (
      initializer &&
      ts.isCallExpression(initializer) &&
      initializer.arguments.length > 0
    ) {
      const firstArg = initializer.arguments[0];
      if (
        firstArg &&
        (ts.isArrowFunction(firstArg) || ts.isFunctionExpression(firstArg))
      ) {
        initializer = firstArg;
      }
    }

    // Only return function ID if the variable actually holds a function
    if (
      initializer &&
      (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))
    ) {
      return `${relativePath}:${node.name.text}`;
    }
  }

  // Method declarations (class methods, object methods)
  if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
    return `${relativePath}:${node.name.text}`;
  }

  return null;
}

export function buildCallGraph(program: ts.Program): CallGraph {
  const callGraph: CallGraph = new Map();
  const typeChecker = program.getTypeChecker();

  function visit(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    currentFunctionName: string | null
  ) {
    let newCurrentFunctionName = currentFunctionName;
    const functionId = getFunctionId(node, sourceFile);

    if (functionId) {
      newCurrentFunctionName = functionId;
      if (!callGraph.has(functionId)) {
        const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        callGraph.set(functionId, {
          callers: [],
          definition: { startLine: start.line + 1, endLine: end.line + 1 },
        });
      }
    }

    const resolveDeclaration = (
      expressionNode: ts.Node
    ): ts.Declaration | undefined => {
      let symbol = typeChecker.getSymbolAtLocation(expressionNode);
      if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
        symbol = typeChecker.getAliasedSymbol(symbol);
      }
      const declarations = symbol?.getDeclarations();
      return declarations && declarations.length > 0
        ? declarations[0]
        : undefined;
    };

    const addDependencyLink = (
      calleeDecl: ts.Declaration,
      callSiteNode: ts.Node,
      callerId: string
    ) => {
      const calleeId = getFunctionId(calleeDecl, calleeDecl.getSourceFile());
      if (!calleeId) return;

      if (!callGraph.has(calleeId)) {
        const start = calleeDecl
          .getSourceFile()
          .getLineAndCharacterOfPosition(calleeDecl.getStart());
        const end = calleeDecl
          .getSourceFile()
          .getLineAndCharacterOfPosition(calleeDecl.getEnd());
        callGraph.set(calleeId, {
          callers: [],
          definition: { startLine: start.line + 1, endLine: end.line + 1 },
        });
      }
      const calleeNode = callGraph.get(calleeId);
      if (!calleeNode) return;

      const { line } = sourceFile.getLineAndCharacterOfPosition(
        callSiteNode.getStart()
      );
      const lineNumber = line + 1;
      if (
        !calleeNode.callers.some(
          (c) => c.callerId === callerId && c.line === lineNumber
        )
      ) {
        calleeNode.callers.push({ callerId, line: lineNumber });
      }
    };

    // Handle React.memo and similar patterns
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isCallExpression(node.initializer)
    ) {
      const callExpr = node.initializer;
      const exprText = callExpr.expression.getText();
      if (
        (exprText === 'memo' || exprText === 'React.memo') &&
        callExpr.arguments.length > 0 &&
        callExpr.arguments[0]
      ) {
        const wrappedComponentDecl = resolveDeclaration(callExpr.arguments[0]);
        const memoizedComponentId = getFunctionId(node, sourceFile);
        if (wrappedComponentDecl && memoizedComponentId) {
          addDependencyLink(wrappedComponentDecl, node, memoizedComponentId);
        }
      }
    }

    // Handle function calls and JSX usage
    if (currentFunctionName) {
      let usageNode: ts.Node | undefined;
      if (
        ts.isCallExpression(node) &&
        node.expression.kind !== ts.SyntaxKind.ImportKeyword
      ) {
        usageNode = node.expression;
      } else if (
        ts.isJsxOpeningElement(node) ||
        ts.isJsxSelfClosingElement(node)
      ) {
        usageNode = node.tagName;
      }

      if (usageNode) {
        const calleeDecl = resolveDeclaration(usageNode);
        if (calleeDecl) {
          addDependencyLink(calleeDecl, node, currentFunctionName);
        }
      }

      // Handle dynamic imports
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      ) {
        const moduleSpecifier = node.arguments[0];
        if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
          const resolved = ts.resolveModuleName(
            moduleSpecifier.text,
            sourceFile.fileName,
            program.getCompilerOptions(),
            ts.sys
          );
          if (resolved.resolvedModule) {
            const targetSourceFile = program.getSourceFile(
              resolved.resolvedModule.resolvedFileName
            );
            if (targetSourceFile) {
              const defaultExport = targetSourceFile.statements.find(
                (s): s is ts.ExportAssignment =>
                  ts.isExportAssignment(s) && !s.isExportEquals
              );
              if (defaultExport) {
                const calleeDecl = resolveDeclaration(defaultExport.expression);
                if (calleeDecl) {
                  addDependencyLink(calleeDecl, node, currentFunctionName);
                }
              }
            }
          }
        }
      }
    }

    ts.forEachChild(node, (childNode) =>
      visit(childNode, sourceFile, newCurrentFunctionName)
    );
  }

  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      visit(sourceFile, sourceFile, null);
    }
  }

  return callGraph;
}

// Impact analysis
export function findChangedFunctions(
  callGraph: CallGraph,
  changedLinesByFile: Map<string, Set<number>>
): Map<string, Set<string>> {
  const changedFunctionsByFile = new Map<string, Set<string>>();

  for (const [functionId, { definition }] of callGraph.entries()) {
    const parts = functionId.split(':');
    const filePath = parts[0];
    if (!filePath) continue;

    const changedLines = changedLinesByFile.get(filePath);
    if (changedLines) {
      for (const line of changedLines) {
        if (line >= definition.startLine && line <= definition.endLine) {
          if (!changedFunctionsByFile.has(filePath)) {
            changedFunctionsByFile.set(filePath, new Set());
          }
          changedFunctionsByFile.get(filePath)!.add(functionId);
          break;
        }
      }
    }
  }

  return changedFunctionsByFile;
}

// Helper interface for grouped callers
interface GroupedCaller {
  file: string;
  functions: Array<{ callerId: string; functionName: string; line: number }>;
}

// Function to group callers by file
function groupCallersByFile(callers: CallSite[]): GroupedCaller[] {
  const fileGroups = new Map<
    string,
    Array<{ callerId: string; functionName: string; line: number }>
  >();

  for (const caller of callers) {
    const parts = caller.callerId.split(':');
    const file = parts[0] || 'unknown';
    const functionName = parts[1] || 'unknown';

    if (!fileGroups.has(file)) {
      fileGroups.set(file, []);
    }

    fileGroups.get(file)!.push({
      callerId: caller.callerId,
      functionName,
      line: caller.line,
    });
  }

  return Array.from(fileGroups.entries()).map(([file, functions]) => ({
    file,
    functions: functions.sort((a, b) => a.line - b.line), // Sort by line number
  }));
}

export function generateImpactTree(
  calleeId: string,
  callGraph: CallGraph,
  maxDepth: number | null = null,
  visitedPath: Set<string> = new Set(),
  currentDepth = 0,
  prefix = '',
  globalVisited: Set<string> = new Set(),
  nodeCounter: { count: number } = { count: 0 },
  maxNodes: number | null = null,
  compact: boolean = false,
  groupByFile: boolean = true
): string[] {
  const lines: string[] = [];

  // Check node limit
  if (maxNodes !== null && nodeCounter.count >= maxNodes) {
    lines.push(`${prefix}└── (Node limit reached - ${maxNodes} nodes)`);
    return lines;
  }

  if (maxDepth !== null && currentDepth >= maxDepth) {
    lines.push(`${prefix}└── (Max depth reached)`);
    return lines;
  }

  if (visitedPath.has(calleeId)) {
    const parts = calleeId.split(':');
    const funcName = parts[1] || 'unknown';
    lines.push(`${prefix}└── (Circular reference to ${funcName})`);
    return lines;
  }

  // In compact mode or if already visited, show reference instead of full expansion
  if ((compact || globalVisited.has(calleeId)) && currentDepth > 0) {
    const parts = calleeId.split(':');
    const funcName = parts[1] || 'unknown';
    const callerCount = callGraph.get(calleeId)?.callers?.length || 0;
    lines.push(
      `${prefix}└── (Reference to ${funcName} - ${callerCount} caller${
        callerCount !== 1 ? 's' : ''
      })`
    );
    nodeCounter.count++;
    return lines;
  }

  visitedPath.add(calleeId);
  globalVisited.add(calleeId);
  nodeCounter.count++;

  const calleeNode = callGraph.get(calleeId);
  const callers = calleeNode?.callers ?? [];

  if (groupByFile && callers.length > 0) {
    // Group callers by file
    const groupedCallers = groupCallersByFile(callers);

    // In compact mode, limit the number of file groups shown
    const displayGroups =
      compact && groupedCallers.length > 3
        ? groupedCallers.slice(0, 3)
        : groupedCallers;
    const hiddenGroupCount = groupedCallers.length - displayGroups.length;
    const hiddenCallersInGroups =
      hiddenGroupCount > 0
        ? groupedCallers
            .slice(3)
            .reduce((sum, group) => sum + group.functions.length, 0)
        : 0;

    displayGroups.forEach((group, groupIndex) => {
      const isLastGroup =
        groupIndex === displayGroups.length - 1 && hiddenGroupCount === 0;
      const groupConnector = isLastGroup ? '└──' : '├──';
      const groupPrefix = prefix + (isLastGroup ? '    ' : '│   ');

      if (group.functions.length === 1) {
        // Single function in file - show normally
        const func = group.functions[0];
        if (func) {
          lines.push(
            `${prefix}${groupConnector} ${func.functionName} in ${truncatePath(
              group.file
            )} (line ~${func.line})`
          );
          lines.push(
            ...generateImpactTree(
              func.callerId,
              callGraph,
              maxDepth,
              visitedPath,
              currentDepth + 1,
              groupPrefix,
              globalVisited,
              nodeCounter,
              maxNodes,
              compact,
              groupByFile
            )
          );
        }
      } else {
        // Multiple functions in same file - group them
        const funcNames = group.functions.map((f) => f.functionName).join(', ');
        const lineNumbers = group.functions
          .map((f) => f.line)
          .sort((a, b) => a - b);
        const lineInfo =
          lineNumbers.length > 1
            ? `lines ~${lineNumbers.join(', ')}`
            : `line ~${lineNumbers[0] || '?'}`;

        lines.push(
          `${prefix}${groupConnector} ${funcNames} in ${truncatePath(
            group.file
          )} (${lineInfo})`
        );

        // For grouped functions, we need to traverse all their dependencies
        // but we'll show them as a consolidated branch
        const consolidatedLines: string[] = [];
        const groupGlobalVisited = new Set(globalVisited);

        for (const func of group.functions) {
          const funcLines = generateImpactTree(
            func.callerId,
            callGraph,
            maxDepth,
            new Set(visitedPath),
            currentDepth + 1,
            '',
            groupGlobalVisited,
            nodeCounter,
            maxNodes,
            compact,
            groupByFile
          );
          consolidatedLines.push(...funcLines);
        }

        // Remove duplicates and apply prefix
        const uniqueLines = [...new Set(consolidatedLines)]
          .filter((line) => line.trim().length > 0)
          .map((line) => `${groupPrefix}${line}`);

        lines.push(...uniqueLines);
      }
    });

    // Show summary for hidden file groups
    if (hiddenGroupCount > 0) {
      lines.push(
        `${prefix}└── (... and ${hiddenCallersInGroups} more caller${
          hiddenCallersInGroups !== 1 ? 's' : ''
        } in ${hiddenGroupCount} file${hiddenGroupCount !== 1 ? 's' : ''})`
      );
    }
  } else {
    // Fall back to original behavior if not grouping by file
    const displayCallers =
      compact && callers.length > 5 ? callers.slice(0, 5) : callers;
    const hiddenCount = callers.length - displayCallers.length;

    displayCallers.forEach((callSite, index) => {
      const { callerId, line } = callSite;
      const callerParts = callerId.split(':');
      const callerFile = callerParts[0] || 'unknown';
      const callerFunc = callerParts[1] || 'unknown';
      const isLast = index === displayCallers.length - 1 && hiddenCount === 0;
      const connector = isLast ? '└──' : '├──';
      const newPrefix = prefix + (isLast ? '    ' : '│   ');

      lines.push(
        `${prefix}${connector} ${callerFunc} in ${truncatePath(
          callerFile
        )} (line ~${line})`
      );
      lines.push(
        ...generateImpactTree(
          callerId,
          callGraph,
          maxDepth,
          visitedPath,
          currentDepth + 1,
          newPrefix,
          globalVisited,
          nodeCounter,
          maxNodes,
          compact,
          groupByFile
        )
      );
    });

    // Show summary for hidden callers
    if (hiddenCount > 0) {
      lines.push(
        `${prefix}└── (... and ${hiddenCount} more caller${
          hiddenCount !== 1 ? 's' : ''
        })`
      );
    }
  }

  visitedPath.delete(calleeId);
  return lines;
}

// Variable tracking functions
export function getVariableId(
  node: ts.Node,
  sourceFile: ts.SourceFile
): string | null {
  const relativePath = path.relative(process.cwd(), sourceFile.fileName);

  // Variable declarations (const, let, var)
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    return `${relativePath}:${node.name.text}`;
  }

  // Function parameters
  if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
    return `${relativePath}:${node.name.text}`;
  }

  // Import declarations
  if (ts.isImportSpecifier(node) && node.name) {
    return `${relativePath}:${node.name.text}`;
  }

  if (ts.isImportClause(node) && node.name) {
    return `${relativePath}:${node.name.text}`;
  }

  return null;
}

export function getVariableType(
  node: ts.Node
): 'const' | 'let' | 'var' | 'import' | 'export' | 'parameter' {
  if (ts.isVariableDeclaration(node)) {
    const parent = node.parent?.parent;
    if (ts.isVariableStatement(parent)) {
      const declarationList = parent.declarationList;
      if (declarationList.flags & ts.NodeFlags.Const) return 'const';
      if (declarationList.flags & ts.NodeFlags.Let) return 'let';
      return 'var';
    }
  }

  if (ts.isParameter(node)) return 'parameter';
  if (ts.isImportSpecifier(node) || ts.isImportClause(node)) return 'import';
  if (ts.isExportSpecifier(node)) return 'export';

  return 'var'; // fallback
}

export function getVariableScope(
  node: ts.Node
): 'global' | 'module' | 'function' | 'block' {
  let parent = node.parent;
  while (parent) {
    if (
      ts.isFunctionDeclaration(parent) ||
      ts.isArrowFunction(parent) ||
      ts.isFunctionExpression(parent) ||
      ts.isMethodDeclaration(parent)
    ) {
      return 'function';
    }
    if (ts.isBlock(parent)) {
      return 'block';
    }
    if (ts.isSourceFile(parent)) {
      return 'module';
    }
    parent = parent.parent;
  }
  return 'global';
}

export function buildVariableGraph(
  program: ts.Program,
  debug = false
): VariableGraph {
  const variableGraph: VariableGraph = new Map();
  const typeChecker = program.getTypeChecker();

  const log = (message: string) => {
    if (debug) {
      console.log(`[Variable Debug] ${message}`);
    }
  };

  // First pass: collect all variable declarations
  function collectDeclarations(node: ts.Node, sourceFile: ts.SourceFile) {
    // Handle variable declarations
    const variableId = getVariableId(node, sourceFile);
    if (variableId) {
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

      if (!variableGraph.has(variableId)) {
        variableGraph.set(variableId, {
          usages: [],
          definition: { startLine: start.line + 1, endLine: end.line + 1 },
          type: getVariableType(node),
          scope: getVariableScope(node),
        });
      }
    }

    ts.forEachChild(node, (child) => collectDeclarations(child, sourceFile));
  }

  // Collect all declarations first
  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      collectDeclarations(sourceFile, sourceFile);
    }
  }

  // Second pass: find usages
  function visit(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    currentFunctionId: string | null
  ) {
    let newCurrentFunctionId = currentFunctionId;

    // Check if this is a function and update the current function context
    const functionId = getFunctionId(node, sourceFile);
    if (functionId) {
      newCurrentFunctionId = functionId;
    }

    // Handle variable usages (identifiers)
    if (ts.isIdentifier(node) && newCurrentFunctionId) {
      // Skip if this identifier is part of a declaration
      if (ts.isVariableDeclaration(node.parent) && node.parent.name === node) {
        ts.forEachChild(node, (child) =>
          visit(child, sourceFile, newCurrentFunctionId)
        );
        return;
      }

      if (ts.isParameter(node.parent) && node.parent.name === node) {
        ts.forEachChild(node, (child) =>
          visit(child, sourceFile, newCurrentFunctionId)
        );
        return;
      }

      // Skip import specifier names (we want the usage, not the import declaration)
      if (ts.isImportSpecifier(node.parent) && node.parent.name === node) {
        ts.forEachChild(node, (child) =>
          visit(child, sourceFile, newCurrentFunctionId)
        );
        return;
      }

      // Skip property access identifiers (e.g., obj.prop - we don't want to track 'prop')
      if (
        ts.isPropertyAccessExpression(node.parent) &&
        node.parent.name === node
      ) {
        ts.forEachChild(node, (child) =>
          visit(child, sourceFile, newCurrentFunctionId)
        );
        return;
      }

      // Get the symbol for this identifier
      let symbol = typeChecker.getSymbolAtLocation(node);
      if (symbol) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(
          node.getStart()
        );
        const currentLineNumber = line + 1;

        log(
          `Processing identifier '${node.text}' at ${path.relative(
            process.cwd(),
            sourceFile.fileName
          )}:${currentLineNumber}`
        );
        log(`  - Symbol name: ${symbol.name}`);
        log(`  - Symbol flags: ${symbol.flags}`);
        log(`  - Is alias: ${(symbol.flags & ts.SymbolFlags.Alias) !== 0}`);

        // Handle aliased symbols (imports) - resolve to original
        let originalSymbol = symbol;
        if (symbol.flags & ts.SymbolFlags.Alias) {
          originalSymbol = typeChecker.getAliasedSymbol(symbol);
          log(`  - Aliased to: ${originalSymbol.name}`);
        }

        // Get all declarations for this symbol
        const declarations = originalSymbol.declarations || [];
        log(`  - Found ${declarations.length} declarations`);

        // Find the actual variable declaration (not imports)
        let targetDeclaration: ts.Declaration | undefined;
        for (const decl of declarations) {
          const declFile = decl.getSourceFile().fileName;
          const declLine =
            decl.getSourceFile().getLineAndCharacterOfPosition(decl.getStart())
              .line + 1;
          log(
            `    - Declaration at ${path.relative(
              process.cwd(),
              declFile
            )}:${declLine} (kind: ${ts.SyntaxKind[decl.kind]})`
          );

          if (
            ts.isVariableDeclaration(decl) ||
            ts.isParameter(decl) ||
            ts.isImportSpecifier(decl) ||
            ts.isImportClause(decl)
          ) {
            targetDeclaration = decl;
            log(`    - Selected this declaration as target`);
            break;
          }
        }

        if (targetDeclaration) {
          // Create consistent variable ID
          const targetFile = targetDeclaration.getSourceFile();
          const targetPath = path.relative(process.cwd(), targetFile.fileName);
          const declVariableId = `${targetPath}:${originalSymbol.name}`;

          log(`  - Target variable ID: ${declVariableId}`);
          log(
            `  - Variable exists in graph: ${variableGraph.has(declVariableId)}`
          );

          // Ensure the variable exists in our graph
          if (!variableGraph.has(declVariableId)) {
            const start = targetFile.getLineAndCharacterOfPosition(
              targetDeclaration.getStart()
            );
            const end = targetFile.getLineAndCharacterOfPosition(
              targetDeclaration.getEnd()
            );

            log(`  - Adding new variable to graph`);
            variableGraph.set(declVariableId, {
              usages: [],
              definition: { startLine: start.line + 1, endLine: end.line + 1 },
              type: getVariableType(targetDeclaration),
              scope: getVariableScope(targetDeclaration),
            });
          }

          // Record the usage
          const { line } = sourceFile.getLineAndCharacterOfPosition(
            node.getStart()
          );
          const lineNumber = line + 1;

          // Determine usage type based on context
          let usageType: 'read' | 'write' | 'reference' = 'read';

          // Check if it's a write operation
          const parent = node.parent;
          if (
            ts.isBinaryExpression(parent) &&
            parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            parent.left === node
          ) {
            usageType = 'write';
          } else if (
            ts.isPostfixUnaryExpression(parent) ||
            ts.isPrefixUnaryExpression(parent)
          ) {
            if (
              parent.operator === ts.SyntaxKind.PlusPlusToken ||
              parent.operator === ts.SyntaxKind.MinusMinusToken
            ) {
              usageType = 'write';
            }
          } else if (
            ts.isPropertyAccessExpression(parent) &&
            parent.expression === node
          ) {
            // Handle property access (e.g., CONFIG.apiUrl)
            // Check if the property is being written to
            const grandParent = parent.parent;
            if (
              ts.isBinaryExpression(grandParent) &&
              grandParent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
              grandParent.left === parent
            ) {
              usageType = 'write';
            }
          }

          const variableInfo = variableGraph.get(declVariableId)!;

          log(
            `  - Recording usage: ${usageType} by ${newCurrentFunctionId} at line ${lineNumber}`
          );
          log(`  - Current usages count: ${variableInfo.usages.length}`);

          // Avoid duplicate usage tracking for the same line and function
          if (
            !variableInfo.usages.some(
              (usage) =>
                usage.userId === newCurrentFunctionId &&
                usage.line === lineNumber &&
                usage.usageType === usageType
            )
          ) {
            variableInfo.usages.push({
              userId: newCurrentFunctionId,
              line: lineNumber,
              usageType,
            });
            log(`  - Added usage, new count: ${variableInfo.usages.length}`);
          } else {
            log(`  - Skipped duplicate usage`);
          }
        } else {
          log(`  - No suitable target declaration found`);
        }
      } else {
        log(`Processing identifier '${node.text}' - no symbol found`);
      }
    }

    ts.forEachChild(node, (child) =>
      visit(child, sourceFile, newCurrentFunctionId)
    );
  }

  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      visit(sourceFile, sourceFile, null);
    }
  }

  return variableGraph;
}

export function findChangedVariables(
  variableGraph: VariableGraph,
  changedLinesByFile: Map<string, Set<number>>
): Map<string, Set<string>> {
  const changedVariablesByFile = new Map<string, Set<string>>();

  for (const [variableId, { definition }] of variableGraph.entries()) {
    const parts = variableId.split(':');
    const filePath = parts[0];
    if (!filePath) continue;

    const changedLines = changedLinesByFile.get(filePath);
    if (changedLines) {
      for (const line of changedLines) {
        if (line >= definition.startLine && line <= definition.endLine) {
          if (!changedVariablesByFile.has(filePath)) {
            changedVariablesByFile.set(filePath, new Set());
          }
          changedVariablesByFile.get(filePath)!.add(variableId);
          break;
        }
      }
    }
  }

  return changedVariablesByFile;
}
