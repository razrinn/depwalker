#!/usr/bin/env node

import { Command } from 'commander';
import packageJson from '../package.json';
import {
  getGitDiff,
  parseGitDiff,
  createTsProgram,
  buildCallGraph,
  findChangedFunctions,
  AnalysisResult,
} from './analyzer';
import { printAnalysisResults, Spinner } from './ui';

/**
 * Performs the complete analysis with progress indicators
 */
function performAnalysis(
  diffOutput: string,
  tsConfigPath = './tsconfig.json'
): AnalysisResult {
  let spinner: Spinner;

  // Parse git diff
  spinner = new Spinner('dots', 'Parsing git diff output...');
  spinner.start();
  const changedLinesByFile = parseGitDiff(diffOutput);
  const fileCount = changedLinesByFile.size;
  spinner.succeed(
    `Parsed git diff - found ${fileCount} changed TypeScript file${
      fileCount !== 1 ? 's' : ''
    }`
  );

  // Create TypeScript program
  spinner = new Spinner('dots', 'Creating TypeScript program...');
  spinner.start();
  const program = createTsProgram(tsConfigPath);
  const sourceFiles = program
    .getSourceFiles()
    .filter((sf) => !sf.isDeclarationFile);
  spinner.succeed(
    `Created TypeScript program - analyzing ${sourceFiles.length} source files`
  );

  // Build call graph
  spinner = new Spinner('dots', 'Building call graph from source files...');
  spinner.start();
  const callGraph = buildCallGraph(program);
  const functionCount = callGraph.size;
  spinner.succeed(`Built call graph - discovered ${functionCount} functions`);

  // Find changed functions
  spinner = new Spinner('dots', 'Identifying changed functions...');
  spinner.start();
  const changedFunctions = findChangedFunctions(callGraph, changedLinesByFile);
  const changedFuncCount = Array.from(changedFunctions.values()).reduce(
    (total, funcSet) => total + funcSet.size,
    0
  );
  spinner.succeed(
    `Analysis complete - ${changedFuncCount} changed function${
      changedFuncCount !== 1 ? 's' : ''
    } identified`
  );

  return {
    changedFiles: Array.from(changedLinesByFile.keys()),
    changedFunctions,
    callGraph,
  };
}

/**
 * Main function that orchestrates the analysis
 */
function analyzeProject(
  maxDepth: number | null = null,
  tsConfigPath: string = './tsconfig.json',
  format: string = 'tree'
): void {
  let spinner: Spinner | undefined;

  try {
    // Initial header
    console.log('\n🚀 DepWalker - TypeScript Dependency Analysis\n');

    // Fetch git diff
    spinner = new Spinner('dots', 'Fetching git diff...');
    spinner.start();
    const diffOutput = getGitDiff();

    if (!diffOutput.trim()) {
      spinner.info('No changes detected in git diff');
      console.log('\n✅ No TypeScript files have changed.');
      return;
    }

    spinner.succeed('Git diff fetched successfully');
    console.log(); // Add spacing before analysis

    // Perform analysis with progress indicators
    const result = performAnalysis(diffOutput, tsConfigPath);

    // Add spacing before results
    console.log();

    // Print results
    printAnalysisResults(result, maxDepth, format);
  } catch (error) {
    if (spinner) {
      spinner.fail('Analysis failed');
    }
    console.error('\n❌ Error during analysis:', error);
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
  .option(
    '-f, --format <type>',
    'Output format: tree (default), list, json, summary',
    'tree'
  )
  .action((options) => {
    analyzeProject(options.depth || null, options.tsconfig, options.format);
  });

// Only run CLI if this file is executed directly
if (require.main === module) {
  cli.parse();
}
