import spinners from 'cli-spinners';
import {
  AnalysisResult,
  generateImpactTree,
  truncatePath,
  VariableUsage,
} from './analyzer';

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
 * Simple spinner implementation for CLI progress indication
 */
export class Spinner {
  private spinner: NodeJS.Timeout | null = null;
  private frames: string[];
  private interval: number;
  private currentFrame = 0;
  private text: string;

  constructor(type: keyof typeof spinners = 'dots', text = '') {
    const spinnerData = spinners[type];
    this.frames = spinnerData.frames;
    this.interval = spinnerData.interval;
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

export function printAnalysisResults(options: PrintAnalysisResultsOptions): void {
  const {
    result,
    maxDepth = null,
    format = 'tree',
    compact = false,
    maxNodes = null,
    groupByFile = true
  } = options;
  const {
    changedFiles,
    changedFunctions,
    callGraph,
    changedVariables,
    variableGraph,
  } = result;

  const isJsonFormat = format.toLowerCase() === 'json';

  // For JSON format, directly output JSON without any console messages
  if (isJsonFormat) {
    printJsonFormat(result, maxDepth);
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
    groupByFile = true
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
      groupByFile
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
                groupByFile
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
  const {
    result,
    maxDepth = null
  } = options;
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
