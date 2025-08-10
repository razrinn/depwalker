import spinners from 'cli-spinners';
import { AnalysisResult, generateImpactTree, truncatePath } from './analyzer';

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
      process.stdout.write(`\r${COLORS.cyan}${frame}${COLORS.reset} ${this.text}`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, this.interval);
  }

  succeed(text?: string): void {
    this.stop();
    process.stdout.write(`\r${COLORS.green}✓${COLORS.reset} ${text || this.text}\n`);
  }

  fail(text?: string): void {
    this.stop();
    process.stdout.write(`\r${COLORS.red}✗${COLORS.reset} ${text || this.text}\n`);
  }

  warn(text?: string): void {
    this.stop();
    process.stdout.write(`\r${COLORS.yellow}⚠${COLORS.reset} ${text || this.text}\n`);
  }

  info(text?: string): void {
    this.stop();
    process.stdout.write(`\r${COLORS.cyan}ℹ${COLORS.reset} ${text || this.text}\n`);
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
  format: string = 'tree',
  compact: boolean = false,
  maxNodes: number | null = null,
  groupByFile: boolean = true
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
      printTreeFormat(changedFunctions, callGraph, maxDepth, compact, maxNodes, groupByFile);
      break;
    case 'list':
      printListFormat(changedFunctions, callGraph, maxDepth);
      break;
    case 'json':
      printJsonFormat(result, maxDepth);
      break;
  }
  
  // Always append summary for non-JSON formats
  if (format.toLowerCase() !== 'json') {
    printSummarySection(changedFunctions, callGraph);
  }
}

/**
 * Tree format (original format)
 */
function printTreeFormat(
  changedFunctions: Map<string, Set<string>>,
  callGraph: any,
  maxDepth: number | null,
  compact: boolean = false,
  maxNodes: number | null = null,
  groupByFile: boolean = true
): void {
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
    const lines = generateImpactTree(
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
    );
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
  const colors = COLORS;

  console.log(`\n${colors.bright}📋 Changed Functions and Their Dependencies:${colors.reset}\n`);
  
  for (const [filePath, functionIds] of changedFunctions.entries()) {
    console.log(`\n${colors.bright}${colors.cyan}📁 ${truncatePath(filePath)}:${colors.reset}`);
    
    for (const sourceFunctionId of functionIds) {
      const sourceParts = sourceFunctionId.split(':');
      const sourceFunc = sourceParts[1] || 'unknown';
      const sourceNode = callGraph.get(sourceFunctionId);
      const defLine = sourceNode?.definition?.startLine;
      
      console.log(`\n  ${colors.yellow}🔸 ${colors.bright}${sourceFunc}${colors.reset} ${colors.dim}(line ~${defLine || '?'})${colors.reset}`);
      
      if (!sourceNode || sourceNode.callers.length === 0) {
        console.log(`    ${colors.dim}• No dependencies found${colors.reset}`);
      } else {
        const allDependents = collectAllDependents(sourceFunctionId, callGraph, maxDepth);
        allDependents.forEach((dependent, index) => {
          const [depFile, depFunc] = dependent.split(':');
          const dependentNode = callGraph.get(dependent);
          const lineInfo = dependentNode?.definition?.startLine 
            ? `${colors.dim}(line ~${dependentNode.definition.startLine})${colors.reset}` 
            : '';
          console.log(`    ${colors.green}${index + 1}.${colors.reset} ${colors.bright}${depFunc}${colors.reset} ${colors.dim}in${colors.reset} ${colors.cyan}${truncatePath(depFile || '')}${colors.reset} ${lineInfo}`);
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
 * Summary section (appended to all non-JSON formats)
 */
function printSummarySection(
  changedFunctions: Map<string, Set<string>>,
  callGraph: any
): void {
  const colors = COLORS;

  console.log(`\n\n${colors.bright}📊 Impact Summary:${colors.reset}\n`);
  
  const totalChanged = Array.from(changedFunctions.values())
    .reduce((total, funcSet) => total + funcSet.size, 0);
  const totalFiles = changedFunctions.size;
  
  console.log(`${colors.cyan}•${colors.reset} ${colors.bright}Changed files:${colors.reset} ${colors.green}${totalFiles}${colors.reset}`);
  console.log(`${colors.cyan}•${colors.reset} ${colors.bright}Changed functions:${colors.reset} ${colors.green}${totalChanged}${colors.reset}`);
  
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
  
  console.log(`\n${colors.bright}📈 Impact Distribution:${colors.reset}`);
  console.log(`${colors.cyan}•${colors.reset} ${colors.bright}High impact${colors.reset} ${colors.dim}(6+ dependents):${colors.reset} ${colors.red}${impactStats.high}${colors.reset}`);
  console.log(`${colors.cyan}•${colors.reset} ${colors.bright}Medium impact${colors.reset} ${colors.dim}(3-5 dependents):${colors.reset} ${colors.yellow}${impactStats.medium}${colors.reset}`);
  console.log(`${colors.cyan}•${colors.reset} ${colors.bright}Low impact${colors.reset} ${colors.dim}(1-2 dependents):${colors.reset} ${colors.green}${impactStats.low}${colors.reset}`);
  console.log(`${colors.cyan}•${colors.reset} ${colors.bright}No impact${colors.reset} ${colors.dim}(0 dependents):${colors.reset} ${colors.dim}${impactStats.none}${colors.reset}`);
  
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
    console.log(`\n${colors.bright}🎯 Top Impacted Functions:${colors.reset}`);
    topImpacted.forEach((item, index) => {
      const impactColor = item.count >= 6 ? colors.red : 
                         item.count >= 3 ? colors.yellow : colors.green;
      console.log(`  ${colors.cyan}${index + 1}.${colors.reset} ${colors.bright}${item.function}${colors.reset} ${colors.dim}in${colors.reset} ${colors.cyan}${truncatePath(item.file)}${colors.reset} ${colors.dim}(${colors.reset}${impactColor}${item.count}${colors.reset} ${colors.dim}dependents)${colors.reset}`);
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
