#!/usr/bin/env node
import { Command } from 'commander';
import { writeFileSync } from 'fs';
import path from 'path';
import { getGitDiff, parseGitDiff } from './git.js';
import { createTsProgram, buildCallGraph, findChangedFunctions } from './analyzer.js';
import { printResults, generateMarkdownReport } from './formatter.js';
import type { AnalysisResult } from './types.js';

const VERSION = process.env.PKG_VERSION || '0.0.0';

// Simple spinner
class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private interval: NodeJS.Timeout | null = null;
  private frameIndex = 0;
  private text: string;
  
  constructor(text: string) {
    this.text = text;
  }

  updateText(text: string): void {
    this.text = text;
  }

  start(): void {
    process.stdout.write('\x1B[?25l');
    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      process.stdout.write(`\r\x1b[36m${frame}\x1b[0m ${this.text}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }

  succeed(text?: string): void {
    this.stop();
    console.log(`\r\x1b[32m✓\x1b[0m ${text || this.text}`);
  }

  fail(text?: string): void {
    this.stop();
    console.log(`\r\x1b[31m✗\x1b[0m ${text || this.text}`);
  }

  info(text?: string): void {
    this.stop();
    console.log(`\r\x1b[36mℹ\x1b[0m ${text || this.text}`);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write('\r\x1B[K');
    process.stdout.write('\x1B[?25h');
  }
}

interface CliOptions {
  depth?: number;
  tsconfig?: string;
  output?: string;
}

function runAnalysis(options: CliOptions): void {
  const {
    depth,
    tsconfig = './tsconfig.json',
    output,
  } = options;

  const spinner = new Spinner('');

  try {
    // Get git diff
    spinner.updateText('Fetching git diff...');
    spinner.start();

    const diffOutput = getGitDiff();

    if (!diffOutput.trim()) {
      spinner.info('No changes detected');
      console.log('\n✅ No TypeScript files have changed.');
      return;
    }
    spinner.succeed('Git diff fetched');

    // Parse diff
    spinner.updateText('Parsing git diff...');
    spinner.start();
    const changedLines = parseGitDiff(diffOutput);
    const fileCount = changedLines.size;
    spinner.succeed(`Found ${fileCount} changed TypeScript file${fileCount !== 1 ? 's' : ''}`);

    // Create TS program
    spinner.updateText('Creating TypeScript program...');
    spinner.start();
    const program = createTsProgram(tsconfig);
    const sourceFiles = program.getSourceFiles().filter(sf => !sf.isDeclarationFile);
    spinner.succeed(`Analyzing ${sourceFiles.length} source files`);

    // Build call graph
    spinner.updateText('Building call graph...');
    spinner.start();
    const callGraph = buildCallGraph(program);
    const funcCount = callGraph.size;
    spinner.succeed(`Discovered ${funcCount} functions`);

    // Find changed functions
    spinner.updateText('Identifying changed functions...');
    spinner.start();
    const changedFunctions = findChangedFunctions(callGraph, changedLines);
    const changedCount = Array.from(changedFunctions.values()).reduce((sum, set) => sum + set.size, 0);
    spinner.succeed(`Found ${changedCount} changed function${changedCount !== 1 ? 's' : ''}`);

    const result: AnalysisResult = {
      changedFiles: Array.from(changedLines.keys()),
      changedFunctions,
      callGraph,
    };

    // Generate report
    const report = generateMarkdownReport(result, depth ?? null);

    // Output
    if (output) {
      const outputPath = path.resolve(output);
      writeFileSync(outputPath, report, 'utf-8');
      console.log(`\n✅ Report saved to: ${outputPath}`);
    } else {
      console.log();
      console.log(report);
    }

  } catch (error) {
    spinner.stop();
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error: ${message}`);
    process.exit(1);
  }
}

// Setup CLI
const cli = new Command();

cli
  .name('depwalker')
  .description('Analyze TypeScript dependency changes and their impact')
  .version(VERSION)
  .option('-d, --depth <number>', 'Maximum depth for impact analysis', (v) => {
    const n = parseInt(v, 10);
    if (isNaN(n) || n < 0) throw new Error('Depth must be a positive number');
    return n;
  })
  .option('-t, --tsconfig <path>', 'Path to tsconfig.json', './tsconfig.json')
  .option('-o, --output <file>', 'Save report to file (Markdown format)')
  .action((opts) => {
    runAnalysis({
      depth: opts.depth,
      tsconfig: opts.tsconfig,
      output: opts.output,
    });
  });

cli.parse();
