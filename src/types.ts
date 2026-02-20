// Core types for DepWalker

export interface CallSite {
  callerId: string;
  line: number;
}

export interface LazyImport {
  moduleSpecifier: string;
  line: number;
}

/** Distinguishes what kind of code node a graph entry represents */
export type NodeKind =
  | 'function'        // FunctionDeclaration, ArrowFunction, FunctionExpression
  | 'method'          // MethodDeclaration
  | 'constructor'     // ConstructorDeclaration
  | 'accessor'        // GetAccessor, SetAccessor
  | 'class-property'  // PropertyDeclaration in class (non-function value)
  | 'class'           // ClassDeclaration (container)
  | 'variable'        // Non-function VariableDeclaration (const CONFIG = {...})
  | 'enum';           // EnumDeclaration

export interface FunctionInfo {
  callers: CallSite[];
  definition: { startLine: number; endLine: number };
  kind?: NodeKind;
  lazyImports?: LazyImport[];
}

export type CallGraph = Map<string, FunctionInfo>;

export interface AnalysisResult {
  changedFiles: string[];
  changedFunctions: Map<string, Set<string>>; // filePath -> Set of functionIds
  callGraph: CallGraph;
}

/** Output format for reports */
export type OutputFormat = 'markdown' | 'html';
