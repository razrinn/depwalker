#!/usr/bin/env node

import { Command } from 'commander';
import { writeFileSync } from 'fs';
import path from 'path';
import packageJson from '../package.json' with { type: 'json' };
import {
  getGitDiff,
  parseGitDiff,
  createTsProgram,
  buildCallGraph,
  buildVariableGraph,
  findChangedFunctions,
  findChangedVariables,
  AnalysisResult,
} from './analyzer.js';
import { printAnalysisResults, Spinner } from './ui.js';

/**
 * Performs the complete analysis with progress indicators
 */
interface PerformAnalysisOptions {
  diffOutput: string;
  tsConfigPath?: string;
  includeVariables?: boolean;
  silent?: boolean;
}

function performAnalysis(options: PerformAnalysisOptions): AnalysisResult {
  const {
    diffOutput,
    tsConfigPath = './tsconfig.json',
    includeVariables = true,
    silent = false
  } = options;
  let spinner: Spinner;

  // Parse git diff
  if (!silent) {
    spinner = new Spinner('Parsing git diff output...');
    spinner.start();
  }
  const changedLinesByFile = parseGitDiff(diffOutput);
  const fileCount = changedLinesByFile.size;
  if (!silent) {
    spinner!.succeed(
      `Parsed git diff - found ${fileCount} changed TypeScript file${
        fileCount !== 1 ? 's' : ''
      }`
    );
  }

  // Create TypeScript program
  if (!silent) {
    spinner = new Spinner('Creating TypeScript program...');
    spinner.start();
  }
  const program = createTsProgram(tsConfigPath);
  const sourceFiles = program
    .getSourceFiles()
    .filter((sf) => !sf.isDeclarationFile);
  if (!silent) {
    spinner!.succeed(
      `Created TypeScript program - analyzing ${sourceFiles.length} source files`
    );
  }

  // Build call graph
  if (!silent) {
    spinner = new Spinner('Building call graph from source files...');
    spinner.start();
  }
  const callGraph = buildCallGraph(program);
  const functionCount = callGraph.size;
  if (!silent) {
    spinner!.succeed(
      `Built call graph - discovered ${functionCount} functions`
    );
  }

  // Find changed functions
  if (!silent) {
    spinner = new Spinner('Identifying changed functions...');
    spinner.start();
  }
  const changedFunctions = findChangedFunctions(callGraph, changedLinesByFile);
  const changedFuncCount = Array.from(changedFunctions.values()).reduce(
    (total, funcSet) => total + funcSet.size,
    0
  );
  if (!silent) {
    spinner!.succeed(
      `Analysis complete - ${changedFuncCount} changed function${
        changedFuncCount !== 1 ? 's' : ''
      } identified`
    );
  }

  const result: AnalysisResult = {
    changedFiles: Array.from(changedLinesByFile.keys()),
    changedFunctions,
    callGraph,
  };

  // Variable tracking (if enabled)
  if (includeVariables) {
    // Build variable graph
    if (!silent) {
      spinner = new Spinner('Building variable dependency graph...');
      spinner.start();
    }
    const variableGraph = buildVariableGraph(program);
    const variableCount = variableGraph.size;
    if (!silent) {
      spinner!.succeed(
        `Built variable graph - discovered ${variableCount} variables`
      );
    }

    // Find changed variables
    if (!silent) {
      spinner = new Spinner('Identifying changed variables...');
      spinner.start();
    }
    const changedVariables = findChangedVariables(
      variableGraph,
      changedLinesByFile
    );
    const changedVarCount = Array.from(changedVariables.values()).reduce(
      (total, varSet) => total + varSet.size,
      0
    );
    if (!silent) {
      spinner!.succeed(
        `Variable analysis complete - ${changedVarCount} changed variable${
          changedVarCount !== 1 ? 's' : ''
        } identified`
      );
    }

    result.variableGraph = variableGraph;
    result.changedVariables = changedVariables;
  }

  return result;
}

/**
 * Main function that orchestrates the analysis
 */
interface AnalyzeProjectOptions {
  maxDepth?: number | null;
  tsConfigPath?: string;
  format?: string;
  compact?: boolean;
  maxNodes?: number | null;
  groupByFile?: boolean;
  includeVariables?: boolean;
  output?: string;
}

function analyzeProject(options: AnalyzeProjectOptions = {}): void {
  const {
    maxDepth = null,
    tsConfigPath = './tsconfig.json',
    format = 'tree',
    compact = false,
    maxNodes = null,
    groupByFile = true,
    includeVariables = true,
    output = null
  } = options;
  let spinner: Spinner | undefined;
  const isJsonFormat = format.toLowerCase() === 'json';
  const isHtmlFormat = format.toLowerCase() === 'html';
  const isSilentFormat = isJsonFormat || isHtmlFormat;

  // Prepare to capture output if needed
  let capturedOutput = '';
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  if (output) {
    // Override console.log to capture output
    console.log = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      capturedOutput += message + '\n';
      if (!isSilentFormat) {
        originalConsoleLog(...args);
      }
    };
    console.error = (...args: any[]) => {
      originalConsoleError(...args);
    };
  }

  try {
    // Initial header (suppress for silent formats)
    if (!isSilentFormat) {
      console.log('\n🚀 DepWalker - TypeScript Dependency Analysis\n');
    }

    // Fetch git diff
    if (!isSilentFormat) {
      spinner = new Spinner('Fetching git diff...');
      spinner.start();
    }
    const diffOutput = getGitDiff();

    if (!diffOutput.trim()) {
      if (isJsonFormat) {
        // For JSON format, output empty result structure
        const emptyResult = {
          changedFiles: [],
          analysis: {
            maxDepth,
            timestamp: new Date().toISOString(),
            totalChangedFunctions: 0,
            totalChangedVariables: 0,
          },
          functions: [],
          variables: [],
        };
        console.log(JSON.stringify(emptyResult, null, 2));
        return;
      } else if (isHtmlFormat) {
        // For HTML format, output empty HTML structure
        const emptyHtml = generateEmptyHtml();
        console.log(emptyHtml);
        return;
      } else {
        spinner!.info('No changes detected in git diff');
        console.log('\n✅ No TypeScript files have changed.');
        return;
      }
    }

    if (!isSilentFormat) {
      spinner!.succeed('Git diff fetched successfully');
      console.log(); // Add spacing before analysis
    }

    // Perform analysis with progress indicators (silent for JSON/HTML)
    const result = performAnalysis({
      diffOutput,
      tsConfigPath,
      includeVariables,
      silent: isSilentFormat
    });

    // Add spacing before results (suppress for silent formats)
    if (!isSilentFormat) {
      console.log();
    }

    // Print results
    printAnalysisResults({
      result,
      maxDepth,
      format,
      compact,
      maxNodes,
      groupByFile
    });

    // Save to file if output option is specified
    if (output) {
      // Restore original console.log
      console.log = originalConsoleLog;
      console.error = originalConsoleError;

      try {
        const outputPath = path.resolve(output);
        writeFileSync(outputPath, capturedOutput, 'utf-8');
        if (!isSilentFormat) {
          console.log(`\n✅ Results saved to: ${outputPath}`);
        }
      } catch (writeError) {
        console.error(`\n❌ Failed to write output file: ${writeError}`);
        process.exit(1);
      }
    }
  } catch (error) {
    // Restore console functions if they were overridden
    if (output) {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    }

    if (isJsonFormat) {
      // For JSON format, output error in JSON format to stderr
      const errorResult = {
        error: {
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
      };
      console.error(JSON.stringify(errorResult, null, 2));
      process.exit(1);
    } else if (isHtmlFormat) {
      // For HTML format, output error in HTML
      const errorHtml = generateErrorHtml(error instanceof Error ? error.message : String(error));
      console.log(errorHtml);
      process.exit(1);
    } else {
      if (spinner) {
        spinner.fail('Analysis failed');
      }
      console.error('\n❌ Error during analysis:', error);
      process.exit(1);
    }
  }
}

// Helper function to generate empty HTML
function generateEmptyHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DepWalker - No Changes</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .no-changes { color: #666; font-size: 18px; text-align: center; padding: 40px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 DepWalker Analysis</h1>
        <div class="no-changes">✅ No TypeScript files have changed.</div>
    </div>
</body>
</html>`;
}

// Helper function to generate error HTML
function generateErrorHtml(errorMessage: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DepWalker - Error</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .error { color: #d32f2f; font-size: 16px; padding: 20px; background: #ffebee; border-radius: 4px; border-left: 4px solid #d32f2f; }
    </style>
</head>
<body>
    <div class="container">
        <h1>❌ DepWalker Analysis Error</h1>
        <div class="error">${errorMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    </div>
</body>
</html>`;
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
  .option(
    '-f, --format <type>',
    'Output format: list (default), tree, json, html (summary appended to all text formats)',
    'list'
  )
  .option(
    '-c, --compact',
    'Enable compact mode: reduces duplicate references and limits callers per function'
  )
  .option(
    '--max-nodes <number>',
    'Maximum total nodes to display in entire tree (prevents overly large outputs)',
    (value) => {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 1) {
        throw new Error('Max nodes must be a positive number');
      }
      return parsed;
    }
  )
  .option(
    '--no-file-grouping',
    'Disable grouping multiple functions from same file (shows each function separately)'
  )
  .option(
    '--no-variables',
    'Disable variable change tracking and impact analysis'
  )
  .option(
    '-o, --output <file>',
    'Save output to a file instead of printing to stdout'
  )
  .action((options) => {
    analyzeProject({
      maxDepth: options.depth || null,
      tsConfigPath: options.tsconfig,
      format: options.format,
      compact: options.compact || false,
      maxNodes: options.maxNodes || null,
      groupByFile: options.fileGrouping !== false, // Default to true unless --no-file-grouping is used
      includeVariables: !options.noVariables, // Default to true unless --no-variables is used
      output: options.output || null
    });
  });

// Only run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cli.parse();
}
