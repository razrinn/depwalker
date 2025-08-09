import spinners from 'cli-spinners';
import { AnalysisResult, generateImpactTree, truncatePath } from './analyzer';

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
      process.stdout.write(`\r\x1b[36m${frame}\x1b[0m ${this.text}`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, this.interval);
  }

  succeed(text?: string): void {
    this.stop();
    process.stdout.write(`\r\x1b[32m✓\x1b[0m ${text || this.text}\n`);
  }

  fail(text?: string): void {
    this.stop();
    process.stdout.write(`\r\x1b[31m✗\x1b[0m ${text || this.text}\n`);
  }

  warn(text?: string): void {
    this.stop();
    process.stdout.write(`\r\x1b[33m⚠\x1b[0m ${text || this.text}\n`);
  }

  info(text?: string): void {
    this.stop();
    process.stdout.write(`\r\x1b[36mℹ\x1b[0m ${text || this.text}\n`);
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
export function printAnalysisResults(
  result: AnalysisResult,
  maxDepth: number | null = null,
  format: string = 'tree'
): void {
  const { changedFiles, changedFunctions, callGraph } = result;

  if (changedFiles.length === 0) {
    console.log('✅ No TypeScript files have changed.');
    return;
  }

  console.log(
    '🔍 Changed files:',
    changedFiles.map((p) => truncatePath(p)).join(', ')
  );

  if (changedFunctions.size === 0) {
    console.log(
      '\n🤔 No changed functions were detected within the modified files.'
    );
    return;
  }

  // Route to appropriate formatter
  switch (format.toLowerCase()) {
    case 'tree':
    default:
      printTreeFormat(changedFunctions, callGraph, maxDepth);
      break;
    case 'list':
      printListFormat(changedFunctions, callGraph, maxDepth);
      break;
    case 'json':
      printJsonFormat(result, maxDepth);
      break;
    case 'summary':
      printSummaryFormat(changedFunctions, callGraph);
      break;
  }
}

/**
 * Tree format (original format)
 */
function printTreeFormat(
  changedFunctions: Map<string, Set<string>>,
  callGraph: any,
  maxDepth: number | null
): void {
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

/**
 * List format (flat list of dependencies)
 */
function printListFormat(
  changedFunctions: Map<string, Set<string>>,
  callGraph: any,
  maxDepth: number | null
): void {
  console.log('\n📋 Changed Functions and Their Dependencies:\n');
  
  for (const [filePath, functionIds] of changedFunctions.entries()) {
    console.log(`\n📁 ${truncatePath(filePath)}:`);
    
    for (const sourceFunctionId of functionIds) {
      const sourceParts = sourceFunctionId.split(':');
      const sourceFunc = sourceParts[1] || 'unknown';
      const sourceNode = callGraph.get(sourceFunctionId);
      const defLine = sourceNode?.definition?.startLine;
      
      console.log(`\n  🔸 ${sourceFunc} (line ~${defLine || '?'})`);
      
      if (!sourceNode || sourceNode.callers.length === 0) {
        console.log('    • No dependencies found');
      } else {
        const allDependents = collectAllDependents(sourceFunctionId, callGraph, maxDepth);
        allDependents.forEach((dependent, index) => {
          const [depFile, depFunc] = dependent.split(':');
          console.log(`    ${index + 1}. ${depFunc} in ${truncatePath(depFile || '')}`);
        });
      }
    }
  }
}

/**
 * JSON format
 */
function printJsonFormat(result: AnalysisResult, maxDepth: number | null): void {
  const output = {
    changedFiles: result.changedFiles,
    analysis: {
      maxDepth,
      timestamp: new Date().toISOString(),
      totalChangedFunctions: Array.from(result.changedFunctions.values())
        .reduce((total, funcSet) => total + funcSet.size, 0)
    },
    changes: [] as any[]
  };
  
  for (const [filePath, functionIds] of result.changedFunctions.entries()) {
    for (const functionId of functionIds) {
      const parts = functionId.split(':');
      const functionName = parts[1] || 'unknown';
      const functionNode = result.callGraph.get(functionId);
      
      const dependents = collectAllDependents(functionId, result.callGraph, maxDepth)
        .map(dep => {
          const [depFile, depFunc] = dep.split(':');
          return { file: depFile, function: depFunc };
        });
      
      output.changes.push({
        file: filePath,
        function: functionName,
        line: functionNode?.definition?.startLine || null,
        dependentCount: dependents.length,
        dependents
      });
    }
  }
  
  console.log(JSON.stringify(output, null, 2));
}

/**
 * Summary format (high-level overview)
 */
function printSummaryFormat(
  changedFunctions: Map<string, Set<string>>,
  callGraph: any
): void {
  console.log('\n📊 Impact Summary:\n');
  
  const totalChanged = Array.from(changedFunctions.values())
    .reduce((total, funcSet) => total + funcSet.size, 0);
  const totalFiles = changedFunctions.size;
  
  console.log(`• Changed files: ${totalFiles}`);
  console.log(`• Changed functions: ${totalChanged}`);
  
  // Calculate impact metrics
  const impactStats = { high: 0, medium: 0, low: 0, none: 0 };
  
  for (const [filePath, functionIds] of changedFunctions.entries()) {
    for (const functionId of functionIds) {
      const dependentCount = collectAllDependents(functionId, callGraph, null).length;
      if (dependentCount === 0) impactStats.none++;
      else if (dependentCount <= 2) impactStats.low++;
      else if (dependentCount <= 5) impactStats.medium++;
      else impactStats.high++;
    }
  }
  
  console.log(`\n📈 Impact Distribution:`);
  console.log(`• High impact (6+ dependents): ${impactStats.high}`);
  console.log(`• Medium impact (3-5 dependents): ${impactStats.medium}`);
  console.log(`• Low impact (1-2 dependents): ${impactStats.low}`);
  console.log(`• No impact (0 dependents): ${impactStats.none}`);
  
  // Top impacted functions
  const impactList = [];
  for (const [filePath, functionIds] of changedFunctions.entries()) {
    for (const functionId of functionIds) {
      const parts = functionId.split(':');
      const functionName = parts[1] || 'unknown';
      const dependentCount = collectAllDependents(functionId, callGraph, null).length;
      impactList.push({ file: filePath, function: functionName, count: dependentCount });
    }
  }
  
  const topImpacted = impactList
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
    
  if (topImpacted.length > 0) {
    console.log(`\n🎯 Top Impacted Functions:`);
    topImpacted.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.function} in ${truncatePath(item.file)} (${item.count} dependents)`);
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
  if (visited.has(functionId) || (maxDepth !== null && visited.size >= maxDepth)) {
    return [];
  }
  
  visited.add(functionId);
  const dependents = [];
  const node = callGraph.get(functionId);
  
  if (node && node.callers) {
    for (const caller of node.callers) {
      dependents.push(caller.callerId);
      const childDependents = collectAllDependents(caller.callerId, callGraph, maxDepth, new Set(visited));
      dependents.push(...childDependents);
    }
  }
  
  return [...new Set(dependents)]; // Remove duplicates
}
