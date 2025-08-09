#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import ts from 'typescript';

interface CallSite {
  callerId: string;
  line: number;
}

const callGraph = new Map<
  string,
  { callers: CallSite[]; definition: { startLine: number; endLine: number } }
>();

function truncatePath(filePath: string, numDirs = 3): string {
  const parts = filePath.split(path.sep);
  const partsToShow = numDirs + 1;
  if (parts.length > partsToShow) {
    const sliced = parts.slice(-partsToShow);
    return ['...', ...sliced].join(path.sep);
  }
  return filePath;
}

function getChangedLinesByFile(): Map<string, Set<number>> {
  const changedLines = new Map<string, Set<number>>();
  const diffOutput = execSync('git diff -U0 HEAD').toString();

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

function getFunctionId(
  node: ts.Node,
  sourceFile: ts.SourceFile
): string | null {
  const relativePath = path.relative(process.cwd(), sourceFile.fileName);

  if (ts.isFunctionDeclaration(node) && node.name) {
    return `${relativePath}:${node.name.text}`;
  }

  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    let initializer = node.initializer;
    if (
      initializer &&
      ts.isCallExpression(initializer) &&
      initializer.arguments.length > 0
    ) {
      const firstArg = initializer.arguments[0];
      if (firstArg && (ts.isArrowFunction(firstArg) || ts.isFunctionExpression(firstArg))) {
        initializer = firstArg;
      }
    }
    if (
      initializer &&
      (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))
    ) {
      return `${relativePath}:${node.name.text}`;
    }
  }

  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    return `${relativePath}:${node.name.text}`;
  }

  return null;
}

function visit(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  program: ts.Program,
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
    return declarations && declarations.length > 0 ? declarations[0] : undefined;
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
    visit(childNode, sourceFile, typeChecker, program, newCurrentFunctionName)
  );
}

function analyzeProject() {
  const args = process.argv.slice(2);
  let maxDepth: number | null = null;
  const depthIndex = args.findIndex((arg) => arg === '--depth');
  if (depthIndex !== -1 && depthIndex + 1 < args.length) {
    const depthArg = args[depthIndex + 1];
    if (depthArg) {
      const depthValue = parseInt(depthArg, 10);
      if (!Number.isNaN(depthValue)) {
        maxDepth = depthValue;
      }
    }
  }

  const changedLinesByFile = getChangedLinesByFile();
  if (changedLinesByFile.size === 0) {
    console.log('✅ No TypeScript files have changed.');
    return;
  }
  console.log(
    '🔍 Changed files:',
    Array.from(changedLinesByFile.keys()).map((p) => truncatePath(p))
  );

  console.log('\n---');
  console.log(`Analyzing${maxDepth ? ` with max depth: ${maxDepth}` : ''}...`);
  const tsConfigPath = './tsconfig.json';
  const tsConfigFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
  const parsedTsConfig = ts.parseJsonConfigFileContent(
    tsConfigFile.config,
    ts.sys,
    './'
  );

  const program = ts.createProgram(
    parsedTsConfig.fileNames,
    parsedTsConfig.options
  );
  const typeChecker = program.getTypeChecker();

  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      visit(sourceFile, sourceFile, typeChecker, program, null);
    }
  }

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

  if (changedFunctionsByFile.size === 0) {
    console.log('\n---');
    console.log(
      '🤔 No changed functions were detected within the modified files.'
    );
    return;
  }

  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
  };

  const printImpactTree = (
    calleeId: string,
    prefix: string,
    visitedPath: Set<string>,
    currentDepth: number
  ) => {
    if (maxDepth !== null && currentDepth >= maxDepth) {
      console.log(
        `${prefix}└── ${colors.dim}(Max depth reached)${colors.reset}`
      );
      return;
    }
    if (visitedPath.has(calleeId)) {
      const parts = calleeId.split(':');
      const funcName = parts[1] || 'unknown';
      console.log(
        `${prefix}└── ${colors.dim}(Circular reference to ${funcName})${colors.reset}`
      );
      return;
    }
    visitedPath.add(calleeId);

    const calleeNode = callGraph.get(calleeId);
    const callers = calleeNode?.callers ?? [];
    callers.forEach((callSite, index) => {
      const { callerId, line } = callSite;
      const callerParts = callerId.split(':');
      const callerFile = callerParts[0] || 'unknown';
      const callerFunc = callerParts[1] || 'unknown';
      const isLast = index === callers.length - 1;
      const connector = isLast ? '└──' : '├──';
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      console.log(
        `${prefix}${connector} ${colors.bright}${callerFunc}${
          colors.reset
        } in ${colors.cyan}${truncatePath(callerFile)}${colors.reset} ${
          colors.dim
        }(line ~${line})${colors.reset}`
      );
      printImpactTree(callerId, newPrefix, visitedPath, currentDepth + 1);
    });
    visitedPath.delete(calleeId);
  };

  console.log('\n---');
  console.log('Detected changes in these functions:');
  for (const [filePath, functionIds] of changedFunctionsByFile.entries()) {
    console.log(`  In ${truncatePath(filePath)}:`);
    for (const id of functionIds) {
      const parts = id.split(':');
      const func = parts[1] || 'unknown';
      console.log(`    - ${func}`);
    }
  }

  console.log(
    `\n💥 ${colors.bright}Dependency Walker Analysis${colors.reset} 💥`
  );

  for (const [filePath, functionIds] of changedFunctionsByFile.entries()) {
    console.log(
      `\n\n📁 ${colors.magenta}Changes in: ${colors.bright}${truncatePath(
        filePath
      )}${colors.reset}`
    );
    console.log(
      `${colors.magenta}==================================================${colors.reset}`
    );

    for (const sourceFunctionId of functionIds) {
      const sourceParts = sourceFunctionId.split(':');
      const sourceFunc = sourceParts[1] || 'unknown';
      const sourceNode = callGraph.get(sourceFunctionId);
      const defLine = sourceNode?.definition?.startLine;
      const lineInfo = defLine
        ? `${colors.dim}(line ~${defLine})${colors.reset}`
        : '';

      console.log(
        `\n🎯 ${colors.yellow}Change Source: ${colors.bright}${sourceFunc}${colors.reset} ${lineInfo}`
      );
      console.log(
        `${colors.dim}--------------------------------------------------${colors.reset}`
      );

      if (!sourceNode || sourceNode.callers.length === 0) {
        console.log(`    └── No external callers found in the project.`);
      } else {
        printImpactTree(sourceFunctionId, '    ', new Set<string>(), 0);
      }
    }
  }
}

analyzeProject();
