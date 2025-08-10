import {
  AnalysisResult,
  generateImpactTree,
  truncatePath,
  VariableUsage,
} from './analyzer.js';

/**
 * Centralized color configuration using original tree format colors
 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  green: '\x1b[32m',
  red: '\x1b[31m',
} as const;

/**
 * Simple spinner implementation for CLI progress indication using dots spinner
 */
export class Spinner {
  private spinner: NodeJS.Timeout | null = null;
  private frames: string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private interval: number = 80;
  private currentFrame = 0;
  private text: string;

  constructor(text = '') {
    this.text = text;
  }

  start(): void {
    process.stdout.write('\x1B[?25l'); // Hide cursor
    this.spinner = setInterval(() => {
      const frame = this.frames[this.currentFrame];
      process.stdout.write(
        `\r${COLORS.cyan}${frame}${COLORS.reset} ${this.text}`
      );
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, this.interval);
  }

  succeed(text?: string): void {
    this.stop();
    process.stdout.write(
      `\r${COLORS.green}✓${COLORS.reset} ${text || this.text}\n`
    );
  }

  fail(text?: string): void {
    this.stop();
    process.stdout.write(
      `\r${COLORS.red}✗${COLORS.reset} ${text || this.text}\n`
    );
  }

  warn(text?: string): void {
    this.stop();
    process.stdout.write(
      `\r${COLORS.yellow}⚠${COLORS.reset} ${text || this.text}\n`
    );
  }

  info(text?: string): void {
    this.stop();
    process.stdout.write(
      `\r${COLORS.cyan}ℹ${COLORS.reset} ${text || this.text}\n`
    );
  }

  stop(): void {
    if (this.spinner) {
      clearInterval(this.spinner);
      this.spinner = null;
    }
    process.stdout.write('\r\x1B[K'); // Clear current line
    process.stdout.write('\x1B[?25h'); // Show cursor
  }

  updateText(text: string): void {
    this.text = text;
  }
}

/**
 * Prints the analysis results with formatted output
 */
interface PrintAnalysisResultsOptions {
  result: AnalysisResult;
  maxDepth?: number | null;
  format?: string;
  compact?: boolean;
  maxNodes?: number | null;
  groupByFile?: boolean;
}

export function printAnalysisResults(
  options: PrintAnalysisResultsOptions
): void {
  const {
    result,
    maxDepth = null,
    format = 'tree',
    compact = false,
    maxNodes = null,
    groupByFile = true,
  } = options;
  const {
    changedFiles,
    changedFunctions,
    callGraph,
    changedVariables,
    variableGraph,
  } = result;

  const isJsonFormat = format.toLowerCase() === 'json';
  const isHtmlFormat = format.toLowerCase() === 'html';

  // For JSON format, directly output JSON without any console messages
  if (isJsonFormat) {
    printJsonFormat(result, maxDepth);
    return;
  }

  // For HTML format, output interactive HTML
  if (isHtmlFormat) {
    printHtmlFormat(result, maxDepth);
    return;
  }

  if (changedFiles.length === 0) {
    console.log('✅ No TypeScript files have changed.');
    return;
  }

  console.log(
    '🔍 Changed files:',
    changedFiles.map((p) => truncatePath(p)).join(', ')
  );

  if (
    changedFunctions.size === 0 &&
    (!changedVariables || changedVariables.size === 0)
  ) {
    console.log(
      '\n🤔 No changed functions or variables were detected within the modified files.'
    );
    return;
  }

  // Route to appropriate formatter (non-JSON only)
  switch (format.toLowerCase()) {
    case 'tree':
    default:
      printTreeFormat({ result, maxDepth, compact, maxNodes, groupByFile });
      break;
    case 'list':
      printListFormat({ result, maxDepth });
      break;
  }

  // Always append summary for non-JSON formats
  printSummarySection(result, callGraph);
}

/**
 * Tree format (original format)
 */
interface PrintTreeFormatOptions {
  result: AnalysisResult;
  maxDepth?: number | null;
  compact?: boolean;
  maxNodes?: number | null;
  groupByFile?: boolean;
}

function printTreeFormat(options: PrintTreeFormatOptions): void {
  const {
    result,
    maxDepth = null,
    compact = false,
    maxNodes = null,
    groupByFile = true,
  } = options;
  const { changedFunctions, callGraph, changedVariables, variableGraph } =
    result;
  const colors = COLORS;

  // Global visited tracker to avoid duplicate expansions across the entire analysis
  const globalVisited = new Set<string>();

  // Node counter for limiting tree size
  const nodeCounter = { count: 0 };

  const printImpactTree = (
    calleeId: string,
    prefix: string,
    visitedPath: Set<string>,
    currentDepth: number
  ) => {
    const lines = generateImpactTree({
      calleeId,
      callGraph,
      maxDepth,
      visitedPath,
      currentDepth,
      prefix,
      globalVisited,
      nodeCounter,
      maxNodes,
      compact,
      groupByFile,
    });
    lines.forEach((line) => {
      // Apply colors to the output
      const coloredLine = line
        .replace(
          /^(\s*[├└]──\s+)([^(]+)(\s+in\s+)([^(]+)(\s+\(lines?[^)]*\))$/,
          `$1${colors.bright}$2${colors.reset}$3${colors.cyan}$4${colors.reset}${colors.dim}$5${colors.reset}`
        )
        .replace(
          /\(Max depth reached\)/,
          `${colors.dim}(Max depth reached)${colors.reset}`
        )
        .replace(
          /\(Circular reference to ([^)]+)\)/,
          `${colors.dim}(Circular reference to $1)${colors.reset}`
        )
        .replace(
          /\(Reference to ([^)]+) - ([^)]+)\)/,
          `${colors.dim}(Reference to $1 - $2)${colors.reset}`
        )
        .replace(
          /\(Node limit reached - ([^)]+)\)/,
          `${colors.dim}(Node limit reached - $1)${colors.reset}`
        )
        .replace(
          /\(\.\.\.\s+and\s+([^)]+)\)/,
          `${colors.dim}(... and $1)${colors.reset}`
        );
      console.log(coloredLine);
    });
  };

  console.log('\n---');
  console.log('Detected changes in these functions:');
  for (const [filePath, functionIds] of changedFunctions.entries()) {
    // Filter out any variables that might have leaked into functions
    const actualFunctions = Array.from(functionIds).filter((id) => {
      // Skip if it's in the variable graph
      if (variableGraph && variableGraph.has(id)) {
        return false;
      }
      // Skip if it's in changedVariables
      if (changedVariables) {
        const fileVariables = changedVariables.get(filePath);
        if (fileVariables && fileVariables.has(id)) {
          return false;
        }
      }
      return true;
    });

    if (actualFunctions.length > 0) {
      console.log(`  In ${truncatePath(filePath)}:`);
      for (const id of actualFunctions) {
        const parts = id.split(':');
        const func = parts[1] || 'unknown';
        console.log(`    - ${func}`);
      }
    }
  }

  // Display variable changes if available
  if (changedVariables && changedVariables.size > 0) {
    console.log('\nDetected changes in these variables:');
    for (const [filePath, variableIds] of changedVariables.entries()) {
      console.log(`  In ${truncatePath(filePath)}:`);
      for (const id of variableIds) {
        const parts = id.split(':');
        const varName = parts[1] || 'unknown';
        const varInfo = variableGraph?.get(id);
        const typeStr = varInfo ? ` (${varInfo.type})` : '';
        console.log(`    - ${varName}${colors.dim}${typeStr}${colors.reset}`);
      }
    }
  }

  console.log(
    `\n💥 ${colors.bright}Dependency Walker Analysis${colors.reset} 💥`
  );

  // Show active features
  const features = [];
  if (compact) features.push('Compact mode');
  if (maxNodes) features.push(`Max ${maxNodes} nodes`);
  if (maxDepth) features.push(`Max depth ${maxDepth}`);
  if (groupByFile) features.push('File grouping');
  if (features.length > 0) {
    console.log(`${colors.dim}[${features.join(', ')}]${colors.reset}`);
  }

  for (const [filePath, functionIds] of changedFunctions.entries()) {
    // Filter out any variables that might have leaked into functions
    const actualFunctions = Array.from(functionIds).filter((id) => {
      // Skip if it's in the variable graph
      if (variableGraph && variableGraph.has(id)) {
        return false;
      }
      // Skip if it's in changedVariables
      if (changedVariables) {
        const fileVariables = changedVariables.get(filePath);
        if (fileVariables && fileVariables.has(id)) {
          return false;
        }
      }
      return true;
    });

    if (actualFunctions.length === 0) {
      continue;
    }

    console.log(
      `\n\n📁 ${colors.magenta}Changes in: ${colors.bright}${truncatePath(
        filePath
      )}${colors.reset}`
    );
    console.log(
      `${colors.magenta}==================================================${colors.reset}`
    );

    for (const sourceFunctionId of actualFunctions) {
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

  // Show variable impact analysis
  if (changedVariables && changedVariables.size > 0 && variableGraph) {
    for (const [filePath, variableIds] of changedVariables.entries()) {
      console.log(
        `\n\n📁 ${colors.magenta}Variable Changes in: ${
          colors.bright
        }${truncatePath(filePath)}${colors.reset}`
      );
      console.log(
        `${colors.magenta}==================================================${colors.reset}`
      );

      for (const sourceVariableId of variableIds) {
        const sourceParts = sourceVariableId.split(':');
        const sourceVar = sourceParts[1] || 'unknown';
        const sourceVarNode = variableGraph.get(sourceVariableId);
        const defLine = sourceVarNode?.definition?.startLine;
        const typeInfo = sourceVarNode?.type
          ? `${colors.dim}(${sourceVarNode.type})${colors.reset}`
          : '';
        const lineInfo = defLine
          ? `${colors.dim}(line ~${defLine})${colors.reset}`
          : '';

        console.log(
          `\n📦 ${colors.cyan}Variable Changed: ${colors.bright}${sourceVar}${colors.reset} ${typeInfo} ${lineInfo}`
        );
        console.log(
          `${colors.dim}--------------------------------------------------${colors.reset}`
        );

        if (!sourceVarNode || sourceVarNode.usages.length === 0) {
          console.log(`    └── No usages found in the project.`);
        } else {
          // Group usages by function
          const usagesByFunction = new Map<string, VariableUsage[]>();
          for (const usage of sourceVarNode.usages) {
            if (!usagesByFunction.has(usage.userId)) {
              usagesByFunction.set(usage.userId, []);
            }
            usagesByFunction.get(usage.userId)!.push(usage);
          }

          // Display usages grouped by function
          const usageFunctions = Array.from(usagesByFunction.keys());
          usageFunctions.forEach((functionId, index) => {
            const usages = usagesByFunction.get(functionId)!;
            const funcParts = functionId.split(':');
            const funcFile = funcParts[0] || 'unknown';
            const funcName = funcParts[1] || 'unknown';
            const isLast = index === usageFunctions.length - 1;
            const connector = isLast ? '└──' : '├──';

            // Summarize usage types
            const readCount = usages.filter(
              (u) => u.usageType === 'read'
            ).length;
            const writeCount = usages.filter(
              (u) => u.usageType === 'write'
            ).length;
            const refCount = usages.filter(
              (u) => u.usageType === 'reference'
            ).length;

            let usageTypeStr = '';
            const usageTypes = [];
            if (readCount > 0)
              usageTypes.push(`${readCount} read${readCount > 1 ? 's' : ''}`);
            if (writeCount > 0)
              usageTypes.push(
                `${writeCount} write${writeCount > 1 ? 's' : ''}`
              );
            if (refCount > 0)
              usageTypes.push(`${refCount} ref${refCount > 1 ? 's' : ''}`);

            if (usageTypes.length > 0) {
              usageTypeStr = ` ${colors.dim}(${usageTypes.join(', ')})${
                colors.reset
              }`;
            }

            const lines = usages.map((u) => u.line).sort((a, b) => a - b);
            const lineStr =
              lines.length > 1
                ? `lines ~${lines.slice(0, 3).join(', ')}${
                    lines.length > 3 ? '...' : ''
                  }`
                : `line ~${lines[0]}`;

            console.log(
              `    ${connector} ${colors.bright}${funcName}${colors.reset} in ${
                colors.cyan
              }${truncatePath(funcFile)}${colors.reset} ${
                colors.dim
              }(${lineStr})${colors.reset}${usageTypeStr}`
            );

            // If this function uses the variable, show its impact too
            const functionNode = callGraph.get(functionId);
            if (
              functionNode &&
              functionNode.callers.length > 0 &&
              maxDepth !== 0
            ) {
              const subPrefix = isLast ? '        ' : '    │   ';
              const limitedDepth = maxDepth ? Math.max(1, maxDepth - 1) : 2; // Limit depth for variables
              const subLines = generateImpactTree({
                calleeId: functionId,
                callGraph,
                maxDepth: limitedDepth,
                visitedPath: new Set(),
                currentDepth: 0,
                prefix: subPrefix,
                globalVisited: new Set(),
                nodeCounter: { count: 0 },
                maxNodes: maxNodes ? Math.min(10, maxNodes) : 10, // Limit nodes for variables
                compact: true, // Use compact mode for variables
                groupByFile,
              });
              subLines.slice(0, 5).forEach((line) => {
                // Limit to 5 lines
                const coloredLine = line.replace(
                  /^(\s*[├└]──\s+)([^(]+)(\s+in\s+)([^(]+)(\s+\(lines?[^)]*\))$/,
                  `$1${colors.dim}$2${colors.reset}$3${colors.dim}$4${colors.reset}${colors.dim}$5${colors.reset}`
                );
                console.log(coloredLine);
              });
              if (subLines.length > 5) {
                console.log(
                  `${subPrefix}└── ${colors.dim}(... and ${
                    subLines.length - 5
                  } more dependencies)${colors.reset}`
                );
              }
            }
          });
        }
      }
    }
  }
}

/**
 * List format (flat list of dependencies)
 */
interface PrintListFormatOptions {
  result: AnalysisResult;
  maxDepth?: number | null;
}

function printListFormat(options: PrintListFormatOptions): void {
  const { result, maxDepth = null } = options;
  const { changedFunctions, callGraph, changedVariables, variableGraph } =
    result;
  const colors = COLORS;

  console.log(
    `\n${colors.bright}📋 Changed Functions and Their Dependencies:${colors.reset}\n`
  );

  for (const [filePath, functionIds] of changedFunctions.entries()) {
    // Filter out any variables that might have leaked into functions
    const actualFunctions = Array.from(functionIds).filter((id) => {
      // Skip if it's in the variable graph
      if (variableGraph && variableGraph.has(id)) {
        return false;
      }
      // Skip if it's in changedVariables
      if (changedVariables) {
        const fileVariables = changedVariables.get(filePath);
        if (fileVariables && fileVariables.has(id)) {
          return false;
        }
      }
      return true;
    });

    if (actualFunctions.length === 0) {
      continue;
    }

    console.log(
      `\n${colors.bright}${colors.cyan}📁 ${truncatePath(filePath)}:${
        colors.reset
      }`
    );

    for (const sourceFunctionId of actualFunctions) {
      const sourceParts = sourceFunctionId.split(':');
      const sourceFunc = sourceParts[1] || 'unknown';
      const sourceNode = callGraph.get(sourceFunctionId);
      const defLine = sourceNode?.definition?.startLine;

      console.log(
        `\n  ${colors.yellow}🔸 ${colors.bright}${sourceFunc}${colors.reset} ${
          colors.dim
        }(line ~${defLine || '?'})${colors.reset}`
      );

      if (!sourceNode || sourceNode.callers.length === 0) {
        console.log(`    ${colors.dim}• No dependencies found${colors.reset}`);
      } else {
        const allDependents = collectAllDependents(
          sourceFunctionId,
          callGraph,
          maxDepth
        );
        allDependents.forEach((dependent, index) => {
          const [depFile, depFunc] = dependent.split(':');
          const dependentNode = callGraph.get(dependent);
          const lineInfo = dependentNode?.definition?.startLine
            ? `${colors.dim}(line ~${dependentNode.definition.startLine})${colors.reset}`
            : '';
          console.log(
            `    ${colors.green}${index + 1}.${colors.reset} ${
              colors.bright
            }${depFunc}${colors.reset} ${colors.dim}in${colors.reset} ${
              colors.cyan
            }${truncatePath(depFile || '')}${colors.reset} ${lineInfo}`
          );
        });
      }
    }
  }

  // Add variable changes section
  if (changedVariables && changedVariables.size > 0 && variableGraph) {
    console.log(
      `\n${colors.bright}📦 Changed Variables and Their Usage:${colors.reset}\n`
    );

    for (const [filePath, variableIds] of changedVariables.entries()) {
      console.log(
        `\n${colors.bright}${colors.cyan}📁 ${truncatePath(filePath)}:${
          colors.reset
        }`
      );

      for (const sourceVariableId of variableIds) {
        const sourceParts = sourceVariableId.split(':');
        const sourceVar = sourceParts[1] || 'unknown';
        const sourceVarNode = variableGraph.get(sourceVariableId);
        const defLine = sourceVarNode?.definition?.startLine;
        const typeInfo = sourceVarNode?.type
          ? `${colors.dim}(${sourceVarNode.type})${colors.reset}`
          : '';

        console.log(
          `\n  ${colors.cyan}📦 ${colors.bright}${sourceVar}${
            colors.reset
          } ${typeInfo} ${colors.dim}(line ~${defLine || '?'})${colors.reset}`
        );

        if (!sourceVarNode || sourceVarNode.usages.length === 0) {
          console.log(`    ${colors.dim}• No usages found${colors.reset}`);
        } else {
          // Group usages by function and show them
          const usagesByFunction = new Map<string, VariableUsage[]>();
          for (const usage of sourceVarNode.usages) {
            if (!usagesByFunction.has(usage.userId)) {
              usagesByFunction.set(usage.userId, []);
            }
            usagesByFunction.get(usage.userId)!.push(usage);
          }

          const usageFunctions = Array.from(usagesByFunction.keys());
          usageFunctions.forEach((functionId, index) => {
            const usages = usagesByFunction.get(functionId)!;
            const funcParts = functionId.split(':');
            const funcFile = funcParts[0] || 'unknown';
            const funcName = funcParts[1] || 'unknown';

            // Summarize usage types
            const readCount = usages.filter(
              (u) => u.usageType === 'read'
            ).length;
            const writeCount = usages.filter(
              (u) => u.usageType === 'write'
            ).length;
            const refCount = usages.filter(
              (u) => u.usageType === 'reference'
            ).length;

            let usageTypeStr = '';
            const usageTypes = [];
            if (readCount > 0)
              usageTypes.push(`${readCount} read${readCount > 1 ? 's' : ''}`);
            if (writeCount > 0)
              usageTypes.push(
                `${writeCount} write${writeCount > 1 ? 's' : ''}`
              );
            if (refCount > 0)
              usageTypes.push(`${refCount} ref${refCount > 1 ? 's' : ''}`);

            if (usageTypes.length > 0) {
              usageTypeStr = ` ${colors.dim}(${usageTypes.join(', ')})${
                colors.reset
              }`;
            }

            const lines = usages.map((u) => u.line).sort((a, b) => a - b);
            const lineStr =
              lines.length > 1
                ? `lines ~${lines.slice(0, 3).join(', ')}${
                    lines.length > 3 ? '...' : ''
                  }`
                : `line ~${lines[0]}`;

            console.log(
              `    ${colors.green}${index + 1}.${colors.reset} ${
                colors.bright
              }${funcName}${colors.reset} ${colors.dim}in${colors.reset} ${
                colors.cyan
              }${truncatePath(funcFile)}${colors.reset} ${
                colors.dim
              }(${lineStr})${colors.reset}${usageTypeStr}`
            );
          });
        }
      }
    }
  }
}

/**
 * JSON format
 */
function printJsonFormat(
  result: AnalysisResult,
  maxDepth: number | null
): void {
  const totalChangedVariables = result.changedVariables
    ? Array.from(result.changedVariables.values()).reduce(
        (total, varSet) => total + varSet.size,
        0
      )
    : 0;

  const output = {
    changedFiles: result.changedFiles,
    analysis: {
      maxDepth,
      timestamp: new Date().toISOString(),
      totalChangedFunctions: Array.from(
        result.changedFunctions.values()
      ).reduce((total, funcSet) => total + funcSet.size, 0),
      totalChangedVariables,
    },
    functions: [] as any[],
    variables: [] as any[],
  };

  // Add function changes
  for (const [filePath, functionIds] of result.changedFunctions.entries()) {
    for (const functionId of functionIds) {
      const parts = functionId.split(':');
      const functionName = parts[1] || 'unknown';
      const functionNode = result.callGraph.get(functionId);

      const dependents = collectAllDependents(
        functionId,
        result.callGraph,
        maxDepth
      ).map((dep) => {
        const [depFile, depFunc] = dep.split(':');
        return { file: depFile, function: depFunc };
      });

      output.functions.push({
        file: filePath,
        function: functionName,
        line: functionNode?.definition?.startLine || null,
        dependentCount: dependents.length,
        dependents,
      });
    }
  }

  // Add variable changes
  if (result.changedVariables && result.variableGraph) {
    for (const [filePath, variableIds] of result.changedVariables.entries()) {
      for (const variableId of variableIds) {
        const parts = variableId.split(':');
        const variableName = parts[1] || 'unknown';
        const variableNode = result.variableGraph.get(variableId);

        // Group usages by function
        const usagesByFunction = new Map<string, any[]>();
        if (variableNode) {
          for (const usage of variableNode.usages) {
            if (!usagesByFunction.has(usage.userId)) {
              usagesByFunction.set(usage.userId, []);
            }
            usagesByFunction.get(usage.userId)!.push({
              line: usage.line,
              type: usage.usageType,
            });
          }
        }

        const usages = Array.from(usagesByFunction.entries()).map(
          ([functionId, usageList]) => {
            const funcParts = functionId.split(':');
            return {
              function: funcParts[1] || 'unknown',
              file: funcParts[0] || 'unknown',
              usages: usageList,
            };
          }
        );

        output.variables.push({
          file: filePath,
          variable: variableName,
          line: variableNode?.definition?.startLine || null,
          type: variableNode?.type || 'unknown',
          scope: variableNode?.scope || 'unknown',
          usageCount: variableNode?.usages?.length || 0,
          usedBy: usages,
        });
      }
    }
  }

  console.log(JSON.stringify(output, null, 2));
}

/**
 * Summary section (appended to all non-JSON formats)
 */
function printSummarySection(result: AnalysisResult, callGraph: any): void {
  const { changedFunctions, changedVariables } = result;
  const colors = COLORS;

  console.log(`\n\n${colors.bright}📊 Impact Summary${colors.reset}`);

  // Calculate actual function counts by filtering out variables
  let actualFunctionCount = 0;
  for (const [filePath, functionIds] of changedFunctions.entries()) {
    const actualFunctions = Array.from(functionIds).filter((id) => {
      // Skip if it's in the variable graph
      if (result.variableGraph && result.variableGraph.has(id)) {
        return false;
      }
      // Skip if it's in changedVariables
      if (changedVariables) {
        const fileVariables = changedVariables.get(filePath);
        if (fileVariables && fileVariables.has(id)) {
          return false;
        }
      }
      return true;
    });
    actualFunctionCount += actualFunctions.length;
  }

  const totalChangedVariables = changedVariables
    ? Array.from(changedVariables.values()).reduce(
        (total, varSet) => total + varSet.size,
        0
      )
    : 0;
  const totalFiles = Math.max(
    changedFunctions.size,
    changedVariables?.size || 0
  );

  // Basic counts in a single line
  const functionsStr = `${colors.green}${actualFunctionCount}${
    colors.reset
  } function${actualFunctionCount !== 1 ? 's' : ''}`;
  const variablesStr =
    totalChangedVariables > 0
      ? `, ${colors.green}${totalChangedVariables}${colors.reset} variable${
          totalChangedVariables !== 1 ? 's' : ''
        }`
      : '';
  console.log(
    `${colors.cyan}${totalFiles}${colors.reset} file${
      totalFiles !== 1 ? 's' : ''
    } changed: ${functionsStr}${variablesStr}`
  );

  // Calculate impact distribution
  let highImpactFunctions = 0,
    mediumImpactFunctions = 0,
    lowImpactFunctions = 0;
  let highImpactVariables = 0,
    mediumImpactVariables = 0,
    lowImpactVariables = 0;

  // Count function impact levels
  for (const [filePath, functionIds] of changedFunctions.entries()) {
    for (const functionId of functionIds) {
      const dependentCount = collectAllDependents(
        functionId,
        callGraph,
        null
      ).length;

      // Additional check: make sure this is not a variable by checking multiple sources
      let isVariable = false;

      // Check if it appears in changedVariables
      if (changedVariables) {
        const fileVariables = changedVariables.get(filePath);
        if (fileVariables && fileVariables.has(functionId)) {
          isVariable = true;
        }
      }

      // Also check if it appears in the variableGraph at all
      if (result.variableGraph && result.variableGraph.has(functionId)) {
        isVariable = true;
      }

      if (!isVariable) {
        if (dependentCount >= 6) highImpactFunctions++;
        else if (dependentCount >= 3) mediumImpactFunctions++;
        else if (dependentCount > 0) lowImpactFunctions++;
      }
    }
  }

  // Count variable impact levels
  if (changedVariables && result.variableGraph) {
    for (const [filePath, variableIds] of changedVariables.entries()) {
      for (const variableId of variableIds) {
        const variableNode = result.variableGraph.get(variableId);
        const usageCount = variableNode?.usages?.length || 0;
        if (usageCount >= 6) highImpactVariables++;
        else if (usageCount >= 3) mediumImpactVariables++;
        else if (usageCount > 0) lowImpactVariables++;
      }
    }
  }

  // Show impact distribution in a compact format
  const impactParts = [];

  // High impact (red)
  const totalHighImpact = highImpactFunctions + highImpactVariables;
  if (totalHighImpact > 0) {
    const highParts = [];
    if (highImpactFunctions > 0) highParts.push(`${highImpactFunctions}f`);
    if (highImpactVariables > 0) highParts.push(`${highImpactVariables}v`);
    impactParts.push(`${colors.red}${highParts.join('+')}${colors.reset} high`);
  }

  // Medium impact (yellow)
  const totalMediumImpact = mediumImpactFunctions + mediumImpactVariables;
  if (totalMediumImpact > 0) {
    const mediumParts = [];
    if (mediumImpactFunctions > 0)
      mediumParts.push(`${mediumImpactFunctions}f`);
    if (mediumImpactVariables > 0)
      mediumParts.push(`${mediumImpactVariables}v`);
    impactParts.push(
      `${colors.yellow}${mediumParts.join('+')}${colors.reset} med`
    );
  }

  // Low impact (green)
  const totalLowImpact = lowImpactFunctions + lowImpactVariables;
  if (totalLowImpact > 0) {
    const lowParts = [];
    if (lowImpactFunctions > 0) lowParts.push(`${lowImpactFunctions}f`);
    if (lowImpactVariables > 0) lowParts.push(`${lowImpactVariables}v`);
    impactParts.push(`${colors.green}${lowParts.join('+')}${colors.reset} low`);
  }

  if (impactParts.length > 0) {
    console.log(
      `Impact: ${impactParts.join(', ')} ${
        colors.dim
      }(f=functions, v=variables)${colors.reset}`
    );
  }

  // Show top 3 most impacted items (functions and variables combined)
  const allImpactItems = [];

  // Add functions
  for (const [filePath, functionIds] of changedFunctions.entries()) {
    // Filter out variables from function IDs first
    const actualFunctions = Array.from(functionIds).filter((id) => {
      // Skip if it's in the variable graph
      if (result.variableGraph && result.variableGraph.has(id)) {
        return false;
      }
      // Skip if it's in changedVariables
      if (changedVariables) {
        const fileVariables = changedVariables.get(filePath);
        if (fileVariables && fileVariables.has(id)) {
          return false;
        }
      }
      return true;
    });

    for (const functionId of actualFunctions) {
      const parts = functionId.split(':');
      const functionName = parts[1] || 'unknown';
      const dependentCount = collectAllDependents(
        functionId,
        callGraph,
        null
      ).length;

      if (dependentCount > 0) {
        allImpactItems.push({
          name: functionName,
          file: filePath,
          count: dependentCount,
          type: 'function',
          unit: 'dependent',
        });
      }
    }
  }

  // Add variables
  if (changedVariables && result.variableGraph) {
    for (const [filePath, variableIds] of changedVariables.entries()) {
      for (const variableId of variableIds) {
        const parts = variableId.split(':');
        const variableName = parts[1] || 'unknown';
        const variableNode = result.variableGraph.get(variableId);
        const usageCount = variableNode?.usages?.length || 0;

        if (usageCount > 0) {
          allImpactItems.push({
            name: variableName,
            file: filePath,
            count: usageCount,
            type: 'variable',
            unit: 'usage',
          });
        }
      }
    }
  }

  // Show top 3 most impacted
  const topImpacted = allImpactItems
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  if (topImpacted.length > 0) {
    console.log(`\n${colors.bright}Most impacted:${colors.reset}`);
    topImpacted.forEach((item, index) => {
      const impactColor =
        item.count >= 6
          ? colors.red
          : item.count >= 3
          ? colors.yellow
          : colors.green;
      const icon = item.type === 'function' ? '🎯' : '📦';
      const unitStr = `${item.unit}${item.count !== 1 ? 's' : ''}`;
      console.log(
        `  ${icon} ${colors.bright}${item.name}${colors.reset} ${
          colors.dim
        }in ${truncatePath(item.file)}${colors.reset} ${
          colors.dim
        }(${impactColor}${item.count}${colors.reset} ${colors.dim}${unitStr})${
          colors.reset
        }`
      );
    });
  }
}

/**
 * Helper function to collect all dependents
 */
function collectAllDependents(
  functionId: string,
  callGraph: any,
  maxDepth: number | null,
  visited = new Set<string>()
): string[] {
  if (
    visited.has(functionId) ||
    (maxDepth !== null && visited.size >= maxDepth)
  ) {
    return [];
  }

  visited.add(functionId);
  const dependents = [];
  const node = callGraph.get(functionId);

  if (node && node.callers) {
    for (const caller of node.callers) {
      dependents.push(caller.callerId);
      const childDependents = collectAllDependents(
        caller.callerId,
        callGraph,
        maxDepth,
        new Set(visited)
      );
      dependents.push(...childDependents);
    }
  }

  return [...new Set(dependents)]; // Remove duplicates
}

/**
 * HTML format with interactive dependency graph
 */
function printHtmlFormat(
  result: AnalysisResult,
  maxDepth: number | null
): void {
  const { changedFiles, changedFunctions, callGraph, changedVariables, variableGraph } = result;

  // Build graph data for visualization
  const nodes: any[] = [];
  const edges: any[] = [];
  const nodeMap = new Map<string, number>();
  let nodeId = 0;

  // Helper to get or create node ID
  const getNodeId = (id: string): number => {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, nodeId++);
    }
    return nodeMap.get(id)!;
  };

  // Add changed functions as nodes
  for (const [filePath, functionIds] of changedFunctions.entries()) {
    for (const functionId of functionIds) {
      // Skip if it's actually a variable
      if (variableGraph && variableGraph.has(functionId)) continue;
      if (changedVariables) {
        const fileVariables = changedVariables.get(filePath);
        if (fileVariables && fileVariables.has(functionId)) continue;
      }

      const parts = functionId.split(':');
      const functionName = parts[1] || 'unknown';
      const functionNode = callGraph.get(functionId);
      const nodeIndex = getNodeId(functionId);

      nodes.push({
        id: nodeIndex,
        label: functionName,
        file: truncatePath(filePath),
        fullPath: filePath,
        line: functionNode?.definition?.startLine || null,
        type: 'function',
        changed: true,
        level: 0,
        dependentCount: 0
      });
    }
  }

  // Add changed variables as nodes
  if (changedVariables && variableGraph) {
    for (const [filePath, variableIds] of changedVariables.entries()) {
      for (const variableId of variableIds) {
        const parts = variableId.split(':');
        const variableName = parts[1] || 'unknown';
        const variableNode = variableGraph.get(variableId);
        const nodeIndex = getNodeId(variableId);

        nodes.push({
          id: nodeIndex,
          label: variableName,
          file: truncatePath(filePath),
          fullPath: filePath,
          line: variableNode?.definition?.startLine || null,
          type: 'variable',
          varType: variableNode?.type || 'unknown',
          changed: true,
          level: 0,
          usageCount: variableNode?.usages?.length || 0
        });
      }
    }
  }

  // Build dependency tree and add edges
  const visited = new Set<string>();
  const processedEdges = new Set<string>();

  // Process function dependencies
  for (const [filePath, functionIds] of changedFunctions.entries()) {
    for (const functionId of functionIds) {
      // Skip if it's actually a variable
      if (variableGraph && variableGraph.has(functionId)) continue;
      if (changedVariables) {
        const fileVariables = changedVariables.get(filePath);
        if (fileVariables && fileVariables.has(functionId)) continue;
      }

      const stack: { id: string; depth: number }[] = [{ id: functionId, depth: 0 }];
      const localVisited = new Set<string>();

      while (stack.length > 0) {
        const { id: currentId, depth } = stack.pop()!;
        if (localVisited.has(currentId) || (maxDepth !== null && depth > maxDepth)) {
          continue;
        }
        localVisited.add(currentId);

        const currentNode = callGraph.get(currentId);
        if (currentNode && currentNode.callers) {
          for (const caller of currentNode.callers) {
            const callerId = caller.callerId;
            const callerNodeId = getNodeId(callerId);
            const currentNodeId = getNodeId(currentId);

            // Add caller node if not exists
            if (!nodeMap.has(callerId) || nodes.findIndex(n => n.id === callerNodeId) === -1) {
              const [callerFile, callerFunc] = callerId.split(':');
              const callerNode = callGraph.get(callerId);
              nodes.push({
                id: callerNodeId,
                label: callerFunc || 'unknown',
                file: truncatePath(callerFile || ''),
                fullPath: callerFile || '',
                line: callerNode?.definition?.startLine || null,
                type: 'function',
                changed: false,
                level: depth + 1,
                dependentCount: 0
              });
            }

            // Add edge
            const edgeKey = `${callerNodeId}-${currentNodeId}`;
            if (!processedEdges.has(edgeKey)) {
              edges.push({
                from: callerNodeId,
                to: currentNodeId,
                type: 'calls',
                line: caller.line
              });
              processedEdges.add(edgeKey);

              // Update dependent count for changed node
              const changedNodeIndex = nodes.findIndex(n => n.id === currentNodeId);
              if (changedNodeIndex !== -1 && nodes[changedNodeIndex].changed) {
                nodes[changedNodeIndex].dependentCount++;
              }
            }

            // Continue traversing
            stack.push({ id: callerId, depth: depth + 1 });
          }
        }
      }
    }
  }

  // Process variable usages
  if (changedVariables && variableGraph) {
    for (const [filePath, variableIds] of changedVariables.entries()) {
      for (const variableId of variableIds) {
        const variableNode = variableGraph.get(variableId);
        if (variableNode && variableNode.usages) {
          const varNodeId = getNodeId(variableId);

          for (const usage of variableNode.usages) {
            const userNodeId = getNodeId(usage.userId);

            // Add user node if not exists
            if (!nodeMap.has(usage.userId) || nodes.findIndex(n => n.id === userNodeId) === -1) {
              const [userFile, userFunc] = usage.userId.split(':');
              nodes.push({
                id: userNodeId,
                label: userFunc || 'unknown',
                file: truncatePath(userFile || ''),
                fullPath: userFile || '',
                line: usage.line,
                type: 'function',
                changed: false,
                level: 1,
                dependentCount: 0
              });
            }

            // Add edge for variable usage
            const edgeKey = `${userNodeId}-${varNodeId}`;
            if (!processedEdges.has(edgeKey)) {
              edges.push({
                from: userNodeId,
                to: varNodeId,
                type: 'uses',
                usageType: usage.usageType,
                line: usage.line
              });
              processedEdges.add(edgeKey);
            }
          }
        }
      }
    }
  }

  // Calculate statistics
  const totalChangedFunctions = Array.from(changedFunctions.values())
    .reduce((total, funcSet) => {
      // Filter out variables
      const actualFunctions = Array.from(funcSet).filter(id => {
        if (variableGraph && variableGraph.has(id)) return false;
        if (changedVariables) {
          for (const [fp, vars] of changedVariables.entries()) {
            if (vars.has(id)) return false;
          }
        }
        return true;
      });
      return total + actualFunctions.length;
    }, 0);

  const totalChangedVariables = changedVariables
    ? Array.from(changedVariables.values()).reduce((total, varSet) => total + varSet.size, 0)
    : 0;

  // Generate HTML with embedded graph data
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DepWalker - Dependency Analysis</title>
    <script src="https://unpkg.com/vis-network@9.1.9/dist/vis-network.min.js"></script>
    <link href="https://unpkg.com/vis-network@9.1.9/dist/dist/vis-network.min.css" rel="stylesheet" type="text/css" />
    <style>
        :root {
            --color-primary: hsl(222.2, 47.4%, 11.2%);
            --color-primary-foreground: hsl(210, 40%, 98%);
            --color-secondary: hsl(210, 40%, 96.1%);
            --color-accent: hsl(210, 40%, 96.1%);
            --color-muted: hsl(210, 40%, 96.1%);
            --color-border: hsl(214.3, 31.8%, 91.4%);
            --color-success: hsl(142, 76%, 36%);
            --color-warning: hsl(38, 92%, 50%);
            --color-error: hsl(0, 84%, 60%);
            --color-info: hsl(199, 89%, 48%);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
            height: 100%;
            overflow: hidden;
        }
        body {
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: rgba(23, 23, 23, 0.95);
            padding: 1.5rem 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
            backdrop-filter: blur(10px);
            flex-shrink: 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .header h1 {
            color: #ffffff;
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .stats {
            display: flex;
            gap: 2rem;
            margin-top: 1rem;
            flex-wrap: wrap;
        }
        .stat {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }
        .stat-label {
            font-size: 0.875rem;
            color: #9ca3af;
            font-weight: 500;
        }
        .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #ffffff;
        }
        .main-container {
            flex: 1;
            display: flex;
            gap: 1.5rem;
            padding: 1.5rem;
            min-height: 0; /* Important for flex children */
            overflow: hidden;
        }
        .graph-container {
            flex: 1;
            background: rgba(23, 23, 23, 0.95);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            border: 1px solid rgba(255,255,255,0.1);
        }
        #mynetwork {
            width: 100%;
            flex: 1;
            min-height: 0; /* Prevents infinite expansion */
            background: #111111;
        }
        .sidebar {
            width: 320px;
            background: rgba(23, 23, 23, 0.95);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            padding: 1.5rem;
            overflow-y: auto;
            flex-shrink: 0;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .legend {
            margin-bottom: 1.5rem;
        }
        .legend h3 {
            font-size: 1rem;
            margin-bottom: 1rem;
            color: #ffffff;
            font-weight: 600;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
            color: #e5e7eb;
        }
        .legend-color {
            width: 24px;
            height: 24px;
            border-radius: 4px;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .legend-color.circle {
            border-radius: 50%;
        }
        .node-details {
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--color-border);
        }
        .node-details h3 {
            font-size: 1rem;
            margin-bottom: 1rem;
            color: #ffffff;
            font-weight: 600;
        }
        .node-info {
            background: rgba(31, 41, 55, 0.5);
            padding: 1rem;
            border-radius: 8px;
            font-size: 0.875rem;
            color: #e5e7eb;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .node-info div {
            margin-bottom: 0.5rem;
        }
        .node-info div:last-child {
            margin-bottom: 0;
        }
        .node-info strong {
            color: #ffffff;
            font-weight: 600;
        }
        .controls {
            position: absolute;
            top: 1rem;
            right: 1rem;
            display: flex;
            gap: 0.5rem;
            z-index: 10;
        }
        .controls button {
            padding: 0.6rem 1.2rem;
            background: rgba(59, 130, 246, 0.1);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.2s;
            backdrop-filter: blur(10px);
        }
        .controls button:hover {
            background: rgba(59, 130, 246, 0.2);
            border-color: rgba(59, 130, 246, 0.5);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }
        .controls button:active {
            transform: translateY(0);
        }
        .empty-state {
            text-align: center;
            padding: 3rem;
            color: #9ca3af;
        }
        @media (max-width: 768px) {
            .main-container {
                flex-direction: column;
            }
            .sidebar {
                width: 100%;
                max-height: none;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 DepWalker Dependency Analysis</h1>
        <div class="stats">
            <div class="stat">
                <span class="stat-label">Changed Files</span>
                <span class="stat-value">${changedFiles.length}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Changed Functions</span>
                <span class="stat-value">${totalChangedFunctions}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Changed Variables</span>
                <span class="stat-value">${totalChangedVariables}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Total Dependencies</span>
                <span class="stat-value">${edges.length}</span>
            </div>
        </div>
    </div>
    
    <div class="main-container">
        <div class="graph-container">
            <div class="controls">
                <button onclick="fitNetwork()" title="Fit all nodes in view">🔍 Fit View</button>
                <button onclick="resetSelection()" title="Clear selection">✖ Clear</button>
            </div>
            <div id="mynetwork"></div>
        </div>
        
        <div class="sidebar">
            <div class="legend">
                <h3>Legend</h3>
                <div class="legend-item">
                    <div class="legend-color circle" style="background: #374151; border-color: #6b7280;"></div>
                    <span>Dependent Function</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color circle" style="background: linear-gradient(135deg, #ef4444, #f59e0b, #10b981, #3b82f6); border-color: #fff; border-width: 3px;"></div>
                    <span>Changed Function</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: linear-gradient(135deg, #8b5cf6, #ec4899, #14b8a6, #f97316); border-color: #fff; border-width: 3px;"></div>
                    <span>Changed Variable</span>
                </div>
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 0.75rem; color: #9ca3af; margin-bottom: 0.5rem;">Each changed item has a unique color</div>
                </div>
                <div style="margin-top: 1rem;">
                    <div class="legend-item">
                        <div style="width: 24px; height: 2px; background: #6b7280;"></div>
                        <span>Function Call</span>
                    </div>
                    <div class="legend-item">
                        <div style="width: 24px; height: 3px; background: #8b5cf6;"></div>
                        <span>Variable Usage</span>
                    </div>
                </div>
            </div>
            
            <div class="node-details">
                <h3>Node Details</h3>
                <div id="nodeInfo" class="node-info">
                    <div class="empty-state">Click on a node to see details</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Graph data
        const graphData = ${JSON.stringify({ nodes, edges })};

        // Color palette for changed nodes - each changed item gets a unique color
        const changedNodeColors = [
            { bg: '#ef4444', border: '#dc2626' }, // red
            { bg: '#f59e0b', border: '#d97706' }, // amber
            { bg: '#10b981', border: '#059669' }, // emerald
            { bg: '#3b82f6', border: '#2563eb' }, // blue
            { bg: '#8b5cf6', border: '#7c3aed' }, // violet
            { bg: '#ec4899', border: '#db2777' }, // pink
            { bg: '#14b8a6', border: '#0d9488' }, // teal
            { bg: '#f97316', border: '#ea580c' }, // orange
            { bg: '#84cc16', border: '#65a30d' }, // lime
            { bg: '#06b6d4', border: '#0891b2' }, // cyan
        ];
        
        // Assign colors to changed nodes
        const changedNodeColorMap = new Map();
        let colorIndex = 0;
        graphData.nodes.forEach(node => {
            if (node.changed) {
                changedNodeColorMap.set(node.id, changedNodeColors[colorIndex % changedNodeColors.length]);
                colorIndex++;
            }
        });

        // Helper function to truncate long labels
        function truncateLabel(label, maxLength = 15) {
            if (label.length <= maxLength) return label;
            return label.substring(0, maxLength - 2) + '...';
        }
        
        // Create vis.js nodes and edges
        const visNodes = new vis.DataSet(graphData.nodes.map(node => {
            let color = {
                background: '#374151',
                border: '#6b7280',
                highlight: {
                    background: '#4b5563',
                    border: '#9ca3af'
                },
                hover: {
                    background: '#4b5563',
                    border: '#9ca3af'
                }
            };
            let shape = 'circle';
            let mass = 1;
            let borderWidth = 2;
            let fontSize = 12;
            
            if (node.changed) {
                // Use the assigned color for this changed node
                const assignedColor = changedNodeColorMap.get(node.id);
                color = {
                    background: assignedColor.bg,
                    border: assignedColor.border,
                    highlight: {
                        background: assignedColor.bg,
                        border: assignedColor.border
                    },
                    hover: {
                        background: assignedColor.bg,
                        border: assignedColor.border
                    }
                };
                if (node.type === 'variable') {
                    shape = 'box';
                }
                borderWidth = 4;
                fontSize = 13;
                mass = 2;
            }
            
            // Add level-based positioning hint
            const yLevel = node.changed ? 0 : (node.level || 1);
            
            // Truncate label for display, but keep full name in title
            const displayLabel = truncateLabel(node.label);
            const fullTitle = node.label + ' - ' + node.type + ' in ' + node.file + ' (Line: ' + (node.line || 'N/A') + ')';
            
            return {
                id: node.id,
                label: displayLabel,
                title: fullTitle,
                color: color,
                shape: shape,
                mass: mass,
                borderWidth: borderWidth,
                borderWidthSelected: borderWidth + 2,
                widthConstraint: {
                    minimum: 60,
                    maximum: 120
                },
                heightConstraint: {
                    minimum: 60
                },
                font: {
                    size: fontSize,
                    color: '#ffffff',
                    face: 'Inter, system-ui, -apple-system, sans-serif',
                    bold: node.changed ? '700' : '400',
                    strokeWidth: 2,
                    strokeColor: '#1f2937',
                    multi: false,
                    vadjust: 0
                },
                shadow: {
                    enabled: true,
                    color: 'rgba(0,0,0,0.2)',
                    size: 10,
                    x: 0,
                    y: 3
                },
                chosen: {
                    node: function(values, id, selected, hovering) {
                        if (selected) {
                            values.shadowSize = 15;
                            values.shadowY = 5;
                        }
                    }
                },
                level: yLevel,
                data: node,
                fullLabel: node.label,
                changedColor: node.changed ? changedNodeColorMap.get(node.id) : null
            };
        }));

        const visEdges = new vis.DataSet(graphData.edges.map(edge => ({
            id: edge.from + '-' + edge.to,
            from: edge.from,
            to: edge.to,
            arrows: {
                to: {
                    enabled: true,
                    type: 'arrow',
                    scaleFactor: 0.8
                }
            },
            color: {
                color: edge.type === 'uses' ? '#8b5cf6' : '#6b7280',
                highlight: edge.type === 'uses' ? '#7c3aed' : '#4b5563',
                hover: edge.type === 'uses' ? '#7c3aed' : '#4b5563',
                opacity: 0.8
            },
            width: edge.type === 'uses' ? 2.5 : 1.5,
            smooth: {
                enabled: true,
                type: 'cubicBezier',
                roundness: 0.5
            },
            chosen: {
                edge: function(values, id, selected, hovering) {
                    if (hovering) {
                        values.width = values.width * 1.5;
                    }
                }
            },
            font: {
                size: 10,
                color: '#6b7280',
                strokeWidth: 2,
                strokeColor: '#ffffff',
                align: 'middle'
            },
            data: edge
        })));

        // Create network
        const container = document.getElementById('mynetwork');
        const data = {
            nodes: visNodes,
            edges: visEdges
        };
        
        const options = {
            layout: {
                improvedLayout: true,
                hierarchical: {
                    enabled: true,
                    direction: 'UD',
                    sortMethod: 'directed',
                    nodeSpacing: 250,
                    treeSpacing: 300,
                    levelSeparation: 250,
                    blockShifting: true,
                    edgeMinimization: true,
                    parentCentralization: true,
                    shakeTowards: 'roots'
                }
            },
            physics: {
                enabled: false
            },
            interaction: {
                hover: true,
                tooltipDelay: 100,
                hideEdgesOnDrag: true,
                hideEdgesOnZoom: false,
                keyboard: {
                    enabled: true,
                    speed: {
                        x: 10,
                        y: 10,
                        zoom: 0.02
                    }
                },
                navigationButtons: true,
                zoomView: true,
                zoomSpeed: 0.5
            },
            edges: {
                smooth: {
                    enabled: true,
                    type: 'cubicBezier',
                    forceDirection: 'vertical',
                    roundness: 0.5
                }
            },
            nodes: {
                shapeProperties: {
                    interpolation: true
                }
            },
            groups: {
                changedFunction: {
                    shape: 'circle',
                    font: { bold: true }
                },
                changedVariable: {
                    shape: 'box',
                    font: { bold: true }
                },
                dependent: {
                    shape: 'circle',
                    font: { bold: false }
                }
            }
        };
        
        const network = new vis.Network(container, data, options);
        
        // Track highlighted nodes
        let highlightedNodes = new Set();
        let highlightedEdges = new Set();
        
        // Ensure clean initial state before any events
        setTimeout(() => {
            network.unselectAll();
            clearHighlights();
        }, 10);
        
        // Event handlers
        network.on('click', function(params) {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const node = visNodes.get(nodeId);
                showNodeDetails(node.data);
                highlightConnectedNodes(nodeId);
            } else {
                // Click on empty space - clear highlights
                clearHighlights();
                document.getElementById('nodeInfo').innerHTML = '<div class="empty-state">Click on a node to see details</div>';
            }
        });
        
        // Initial setup after network is ready
        network.on('afterDrawing', function() {
            // Only run once
            network.off('afterDrawing');
            setTimeout(() => {
                fitNetwork();
                network.unselectAll();
                clearHighlights();
            }, 100);
        });
        
        // Helper functions
        function showNodeDetails(node) {
            // Use the full label from the node data, not the truncated display label
            const fullName = node.label || node.data?.label || 'Unknown';
            let html = '<div>';
            html += '<div><strong>Name:</strong> ' + fullName + '</div>';
            html += '<div><strong>Type:</strong> ' + node.type + '</div>';
            html += '<div><strong>File:</strong> ' + node.file + '</div>';
            if (node.line) {
                html += '<div><strong>Line:</strong> ~' + node.line + '</div>';
            }
            if (node.type === 'variable' && node.varType) {
                html += '<div><strong>Variable Type:</strong> ' + node.varType + '</div>';
            }
            if (node.changed) {
                html += '<div><strong>Status:</strong> <span style="color: #ff6b6b;">Changed</span></div>';
                if (node.type === 'function' && node.dependentCount !== undefined) {
                    html += '<div><strong>Dependents:</strong> ' + node.dependentCount + '</div>';
                } else if (node.type === 'variable' && node.usageCount !== undefined) {
                    html += '<div><strong>Usages:</strong> ' + node.usageCount + '</div>';
                }
            }
            html += '</div>';
            document.getElementById('nodeInfo').innerHTML = html;
        }
        
        function fitNetwork() {
            network.fit({
                animation: {
                    duration: 1000,
                    easingFunction: 'easeInOutQuad'
                }
            });
        }
        
        function resetSelection() {
            network.unselectAll();
            clearHighlights();
            document.getElementById('nodeInfo').innerHTML = '<div class="empty-state">Click on a node to see details</div>';
        }
        
        // Find all paths leading TO changed nodes (roots)
        function findPathsToRoots(startNodeId, specificRootId = null) {
            const allNodes = visNodes.get();
            const allEdges = visEdges.get();
            const paths = new Map(); // Map of changed node ID to paths
            
            // Find target changed nodes (roots)
            let targetRootIds;
            if (specificRootId) {
                // If specific root is provided, only find paths to that root
                targetRootIds = [specificRootId];
            } else {
                // Otherwise find paths to all changed nodes
                targetRootIds = allNodes.filter(n => n.data.changed).map(n => n.id);
            }
            
            // For each root, find all paths leading TO it
            targetRootIds.forEach(rootId => {
                const allPathsToRoot = [];
                
                // BFS from the root backwards to find all nodes that lead to it
                const queue = [{nodeId: rootId, path: [rootId], edges: []}];
                const visited = new Set();
                
                while (queue.length > 0) {
                    const {nodeId, path, edges} = queue.shift();
                    
                    if (visited.has(nodeId)) continue;
                    visited.add(nodeId);
                    
                    // Find all edges that point TO this node
                    allEdges.forEach(edge => {
                        // Check if this edge points to the current node
                        if (edge.to === nodeId) {
                            const prevNode = edge.from;
                            
                            // Build the path from prevNode to root
                            const fullPath = [prevNode, ...path];
                            const fullEdges = [edge.id, ...edges];
                            
                            // If this path includes our start node, save it
                            if (prevNode === startNodeId || path.includes(startNodeId)) {
                                allPathsToRoot.push({
                                    nodes: fullPath.slice(fullPath.indexOf(startNodeId)),
                                    edges: fullEdges.slice(fullPath.indexOf(startNodeId))
                                });
                            }
                            
                            // Continue searching backwards
                            if (!visited.has(prevNode)) {
                                queue.push({
                                    nodeId: prevNode,
                                    path: fullPath,
                                    edges: fullEdges
                                });
                            }
                        }
                    });
                }
                
                // Also check direct paths if not found through backward search
                const directPath = findDirectPath(startNodeId, rootId, allEdges);
                if (directPath) {
                    allPathsToRoot.push(directPath);
                }
                
                if (allPathsToRoot.length > 0) {
                    // Store the shortest path to this root
                    const shortestPath = allPathsToRoot.reduce((shortest, current) => 
                        current.nodes.length < shortest.nodes.length ? current : shortest
                    );
                    paths.set(rootId, shortestPath);
                }
            });
            
            return paths;
        }
        
        // Helper function to find direct path between two nodes
        function findDirectPath(fromId, toId, allEdges) {
            const queue = [{nodeId: fromId, path: [fromId], edges: []}];
            const visited = new Set();
            
            while (queue.length > 0) {
                const {nodeId, path, edges} = queue.shift();
                
                if (nodeId === toId) {
                    return {nodes: path, edges: edges};
                }
                
                if (visited.has(nodeId)) continue;
                visited.add(nodeId);
                
                // Find edges from this node
                allEdges.forEach(edge => {
                    if (edge.from === nodeId && !path.includes(edge.to)) {
                        queue.push({
                            nodeId: edge.to,
                            path: [...path, edge.to],
                            edges: [...edges, edge.id]
                        });
                    }
                });
            }
            
            return null;
        }
        
        // Highlight connected nodes function
        function highlightConnectedNodes(nodeId) {
            // Clear ALL previous highlights first
            clearHighlights();
            
            // Wait a bit for the clear to complete
            setTimeout(() => {
                const clickedNode = visNodes.get(nodeId);
                const allNodes = visNodes.get();
                const allEdges = visEdges.get();
                
                let paths;
                
                // If clicked node is a changed node (root), find all paths leading TO it
                if (clickedNode.data.changed) {
                    // Find all nodes that have paths leading to this specific root
                    paths = new Map();
                    
                    // For this root, find all nodes that can reach it
                    const nodesWithPathsToRoot = new Set();
                    const edgesInPaths = new Set();
                    
                    // BFS backwards from the root to find all paths leading to it
                    const visited = new Set();
                    const queue = [nodeId];
                    
                    while (queue.length > 0) {
                        const currentId = queue.shift();
                        if (visited.has(currentId)) continue;
                        visited.add(currentId);
                        nodesWithPathsToRoot.add(currentId);
                        
                        // Find all edges pointing TO this node
                        allEdges.forEach(edge => {
                            if (edge.to === currentId) {
                                edgesInPaths.add(edge.id);
                                nodesWithPathsToRoot.add(edge.from);
                                if (!visited.has(edge.from)) {
                                    queue.push(edge.from);
                                }
                            }
                        });
                    }
                    
                    // Create a pseudo-path for highlighting
                    paths.set(nodeId, {
                        nodes: Array.from(nodesWithPathsToRoot),
                        edges: Array.from(edgesInPaths),
                        isRootView: true
                    });
                } else {
                    // For dependent nodes, find paths to ALL roots
                    paths = findPathsToRoots(nodeId);
                }
                
                if (paths.size === 0) {
                    // No paths found, just highlight the clicked node
                    visNodes.update({
                        id: nodeId,
                        opacity: 1,
                        borderWidth: 4
                    });
                    return;
                }
                
                // Track which nodes and edges are in paths
                const highlightedNodeSet = new Set();
                const highlightedEdgeMap = new Map(); // edge id -> color
                
                // Process each path with its unique color
                paths.forEach((path, rootNodeId) => {
                    const rootNode = allNodes.find(n => n.id === rootNodeId);
                    const pathColor = rootNode.changedColor;
                    
                    // Add all nodes in path to highlighted set
                    if (path.isRootView) {
                        // For root view, highlight all nodes that lead to it
                        path.nodes.forEach(nodeId => highlightedNodeSet.add(nodeId));
                    } else {
                        // For dependent view, highlight nodes in the specific path
                        path.nodes.forEach(nodeId => highlightedNodeSet.add(nodeId));
                    }
                    
                    // Map edges to their colors
                    path.edges.forEach(edgeId => {
                        if (!highlightedEdgeMap.has(edgeId)) {
                            highlightedEdgeMap.set(edgeId, []);
                        }
                        highlightedEdgeMap.get(edgeId).push(pathColor);
                    });
                });
                
                // Update all nodes
                const nodeUpdates = [];
                allNodes.forEach(node => {
                    if (highlightedNodeSet.has(node.id)) {
                        // Check if this is a changed node in one of our paths
                        const isRoot = node.data.changed;
                        const isClickedNode = node.id === nodeId;
                        
                        if (isRoot) {
                            // Highlight root nodes with their color
                            const nodeColor = node.changedColor;
                            nodeUpdates.push({
                                id: node.id,
                                opacity: 1,
                                borderWidth: isClickedNode ? 6 : 4,
                                color: {
                                    background: nodeColor.bg,
                                    border: nodeColor.border
                                }
                            });
                        } else {
                            // Regular nodes in path
                            nodeUpdates.push({
                                id: node.id,
                                opacity: 1,
                                borderWidth: isClickedNode ? 4 : 2
                            });
                        }
                    } else {
                        // Dim unconnected nodes
                        nodeUpdates.push({
                            id: node.id,
                            opacity: 0.1
                        });
                    }
                });
                
                // Update all edges
                const edgeUpdates = [];
                allEdges.forEach(edge => {
                    if (highlightedEdgeMap.has(edge.id)) {
                        // Use the first color if multiple paths use this edge
                        const colors = highlightedEdgeMap.get(edge.id);
                        const edgeColor = colors[0];
                        
                        edgeUpdates.push({
                            id: edge.id,
                            width: 3,
                            color: {
                                color: edgeColor.bg,
                                opacity: 1
                            },
                            arrows: {
                                to: {
                                    enabled: true,
                                    type: 'arrow',
                                    scaleFactor: 1.2,
                                    color: edgeColor.bg
                                }
                            }
                        });
                    } else {
                        // Dim unconnected edges
                        edgeUpdates.push({
                            id: edge.id,
                            color: {
                                opacity: 0.05
                            }
                        });
                    }
                });
                
                visNodes.update(nodeUpdates);
                visEdges.update(edgeUpdates);
            }, 50);
        }
        
        // Clear highlights function
        function clearHighlights() {
            // Get all edges and nodes
            const allNodes = visNodes.get();
            const allEdges = visEdges.get();
            
            // Reset all nodes to original state
            const nodeUpdates = [];
            allNodes.forEach(node => {
                nodeUpdates.push({
                    id: node.id,
                    opacity: 1,
                    borderWidth: node.borderWidth || 2
                });
            });
            
            // Reset all edges to original state
            const edgeUpdates = [];
            allEdges.forEach(edge => {
                const edgeType = edge.data && edge.data.type;
                edgeUpdates.push({
                    id: edge.id,
                    width: edgeType === 'uses' ? 2.5 : 1.5,
                    color: {
                        color: edgeType === 'uses' ? '#8b5cf6' : '#6b7280',
                        opacity: 0.8
                    }
                });
            });
            
            visNodes.update(nodeUpdates);
            visEdges.update(edgeUpdates);
            
            // Clear the tracking sets
            highlightedNodes.clear();
            highlightedEdges.clear();
        }
        
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.key === 'f' || e.key === 'F') {
                fitNetwork();
            } else if (e.key === 'Escape') {
                resetSelection();
            }
        });
    </script>
</body>
</html>`;

  console.log(html);
}
