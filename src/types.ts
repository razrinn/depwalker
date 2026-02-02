// Core types for DepWalker

export interface CallSite {
  callerId: string;
  line: number;
}

export interface FunctionInfo {
  callers: CallSite[];
  definition: { startLine: number; endLine: number };
}

export type CallGraph = Map<string, FunctionInfo>;

export interface AnalysisResult {
  changedFiles: string[];
  changedFunctions: Map<string, Set<string>>; // filePath -> Set of functionIds
  callGraph: CallGraph;
}
