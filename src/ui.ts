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
  maxDepth: number | null = null
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
