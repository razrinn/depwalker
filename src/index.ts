#!/usr/bin/env node

import { Command } from 'commander';
import { execSync } from 'child_process';
import path from 'path';
import ts from 'typescript';
import packageJson from '../package.json';

interface CallSite {
  callerId: string;
  line: number;
}

interface FunctionInfo {
  callers: CallSite[];
  definition: { startLine: number; endLine: number };
}

type CallGraph = Map<string, FunctionInfo>;

interface AnalysisResult {
  changedFiles: string[];
  changedFunctions: Map<string, Set<string>>;
  callGraph: CallGraph;
}

interface Colors {
  reset: string;
  bright: string;
  dim: string;
  yellow: string;
  cyan: string;
  magenta: string;
}

// Pure utility functions
function truncatePath(filePath: string, numDirs = 3): string {
  const parts = filePath.split(path.sep);
  const partsToShow = numDirs + 1;
  if (parts.length > partsToShow) {
    const sliced = parts.slice(-partsToShow);
    return ['...', ...sliced].join(path.sep);
  }
  return filePath;
}

// Pure function to parse git diff output
function parseGitDiff(diffOutput: string): Map<string, Set<number>> {
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

// Pure function to identify changed functions within changed lines
function findChangedFunctions(
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

// Pure function to generate impact tree lines (for testing)
function generateImpactTree(
  calleeId: string,
  callGraph: CallGraph,
  maxDepth: number | null = null,
  visitedPath: Set<string> = new Set(),
  currentDepth = 0,
  prefix = ''
): string[] {
  const lines: string[] = [];

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
        newPrefix
      )
    );
  });

  visitedPath.delete(calleeId);
  return lines;
}

// Pure function to build call graph from TypeScript program
function buildCallGraph(program: ts.Program): CallGraph {
  const callGraph: CallGraph = new Map();
  const typeChecker = program.getTypeChecker();

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
        if (
          firstArg &&
          (ts.isArrowFunction(firstArg) || ts.isFunctionExpression(firstArg))
        ) {
          initializer = firstArg;
        }
      }
      if (
        initializer &&
        (ts.isArrowFunction(initializer) ||
          ts.isFunctionExpression(initializer))
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

// Pure function to create TypeScript program
function createTsProgram(tsConfigPath = './tsconfig.json'): ts.Program {
  try {
    const tsConfigFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
    
    if (tsConfigFile.error) {
      throw new Error(`Failed to read tsconfig file at ${tsConfigPath}: ${ts.formatDiagnostic(tsConfigFile.error, {
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getNewLine: () => ts.sys.newLine
      })}`);
    }

    const parsedTsConfig = ts.parseJsonConfigFileContent(
      tsConfigFile.config,
      ts.sys,
      path.dirname(tsConfigPath)
    );

    if (parsedTsConfig.errors.length > 0) {
      const errorMessages = parsedTsConfig.errors.map(error => 
        ts.formatDiagnostic(error, {
          getCanonicalFileName: (fileName) => fileName,
          getCurrentDirectory: ts.sys.getCurrentDirectory,
          getNewLine: () => ts.sys.newLine
        })
      ).join('\n');
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

// Pure function to perform the complete analysis
function performAnalysis(
  diffOutput: string,
  tsConfigPath = './tsconfig.json'
): AnalysisResult {
  const changedLinesByFile = parseGitDiff(diffOutput);
  const program = createTsProgram(tsConfigPath);
  const callGraph = buildCallGraph(program);
  const changedFunctions = findChangedFunctions(callGraph, changedLinesByFile);

  return {
    changedFiles: Array.from(changedLinesByFile.keys()),
    changedFunctions,
    callGraph,
  };
}

// Side-effect functions for I/O
function getGitDiff(): string {
  return execSync('git diff -U0 HEAD').toString();
}

function printAnalysisResults(
  result: AnalysisResult,
  maxDepth: number | null = null
): void {
  const { changedFiles, changedFunctions, callGraph } = result;

  if (changedFiles.length === 0) {
    console.log('✅ No TypeScript files have changed.');
    return;
  }

  console.log(
    '🔍 Changed files:',
    changedFiles.map((p) => truncatePath(p))
  );

  console.log('\n---');
  console.log(`Analyzing${maxDepth ? ` with max depth: ${maxDepth}` : ''}...`);

  if (changedFunctions.size === 0) {
    console.log('\n---');
    console.log(
      '🤔 No changed functions were detected within the modified files.'
    );
    return;
  }

  const colors: Colors = {
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
    const lines = generateImpactTree(
      calleeId,
      callGraph,
      maxDepth,
      visitedPath,
      currentDepth,
      prefix
    );
    lines.forEach((line) => {
      // Apply colors to the output
      const coloredLine = line
        .replace(
          /^(\s*[├└]──\s+)([^(]+)(\s+in\s+)([^(]+)(\s+\(line[^)]*\))$/,
          `$1${colors.bright}$2${colors.reset}$3${colors.cyan}$4${colors.reset}${colors.dim}$5${colors.reset}`
        )
        .replace(
          /\(Max depth reached\)/,
          `${colors.dim}(Max depth reached)${colors.reset}`
        )
        .replace(
          /\(Circular reference to ([^)]+)\)/,
          `${colors.dim}(Circular reference to $1)${colors.reset}`
        );
      console.log(coloredLine);
    });
  };

  console.log('\n---');
  console.log('Detected changes in these functions:');
  for (const [filePath, functionIds] of changedFunctions.entries()) {
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

  for (const [filePath, functionIds] of changedFunctions.entries()) {
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

// Main function that orchestrates the analysis
function analyzeProject(
  maxDepth: number | null = null,
  tsConfigPath: string = './tsconfig.json'
): void {
  try {
    const diffOutput = getGitDiff();
    const result = performAnalysis(diffOutput, tsConfigPath);
    printAnalysisResults(result, maxDepth);
  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  }
}

// Setup Commander CLI
const cli = new Command();

cli
  .name('depwalker')
  .description('Analyze TypeScript dependency changes and their impact')
  .version(packageJson.version)
  .option(
    '-d, --depth <number>',
    'Maximum depth for dependency analysis',
    (value) => {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 0) {
        throw new Error('Depth must be a positive number');
      }
      return parsed;
    }
  )
  .option(
    '-t, --tsconfig <path>',
    'Path to tsconfig.json file',
    './tsconfig.json'
  )
  .action((options) => {
    analyzeProject(options.depth || null, options.tsconfig);
  });

// Only run CLI if this file is executed directly
if (require.main === module) {
  cli.parse();
}
