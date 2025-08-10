#!/usr/bin/env node

import { Command } from 'commander';
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
    spinner = new Spinner('dots', 'Parsing git diff output...');
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
    spinner = new Spinner('dots', 'Creating TypeScript program...');
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
    spinner = new Spinner('dots', 'Building call graph from source files...');
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
    spinner = new Spinner('dots', 'Identifying changed functions...');
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
      spinner = new Spinner('dots', 'Building variable dependency graph...');
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
      spinner = new Spinner('dots', 'Identifying changed variables...');
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
}

function analyzeProject(options: AnalyzeProjectOptions = {}): void {
  const {
    maxDepth = null,
    tsConfigPath = './tsconfig.json',
    format = 'tree',
    compact = false,
    maxNodes = null,
    groupByFile = true,
    includeVariables = true
  } = options;
  let spinner: Spinner | undefined;
  const isJsonFormat = format.toLowerCase() === 'json';

  try {
    // Initial header (suppress for JSON)
    if (!isJsonFormat) {
      console.log('\n🚀 DepWalker - TypeScript Dependency Analysis\n');
    }

    // Fetch git diff
    if (!isJsonFormat) {
      spinner = new Spinner('dots', 'Fetching git diff...');
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
      } else {
        spinner!.info('No changes detected in git diff');
        console.log('\n✅ No TypeScript files have changed.');
        return;
      }
    }

    if (!isJsonFormat) {
      spinner!.succeed('Git diff fetched successfully');
      console.log(); // Add spacing before analysis
    }

    // Perform analysis with progress indicators (silent for JSON)
    const result = performAnalysis({
      diffOutput,
      tsConfigPath,
      includeVariables,
      silent: isJsonFormat
    });

    // Add spacing before results (suppress for JSON)
    if (!isJsonFormat) {
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
  } catch (error) {
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
    } else {
      if (spinner) {
        spinner.fail('Analysis failed');
      }
      console.error('\n❌ Error during analysis:', error);
      process.exit(1);
    }
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
  .option(
    '-f, --format <type>',
    'Output format: list (default), tree, json (summary appended to all formats)',
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
  .action((options) => {
    analyzeProject({
      maxDepth: options.depth || null,
      tsConfigPath: options.tsconfig,
      format: options.format,
      compact: options.compact || false,
      maxNodes: options.maxNodes || null,
      groupByFile: options.fileGrouping !== false, // Default to true unless --no-file-grouping is used
      includeVariables: !options.noVariables // Default to true unless --no-variables is used
    });
  });

// Only run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cli.parse();
}
