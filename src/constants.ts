// Shared constants for DepWalker

/** Sentinel value for lazy import aliases in component alias tracking */
export const LAZY_IMPORT_SENTINEL = '__LAZY__';

/** Weight multiplier for depth in impact score calculation */
export const IMPACT_DEPTH_WEIGHT = 3;

/** Score thresholds for impact levels */
export const IMPACT_THRESHOLDS = {
  critical: 20,
  high: 10,
  medium: 4,
} as const;

/** Depth thresholds for test priority levels (lower depth = higher priority) */
export const TEST_PRIORITY_THRESHOLDS = {
  /** Direct callers (depth <= this) are high priority */
  high: 1,
  /** Callers within this depth are medium priority, beyond is low */
  medium: 3,
} as const;

/** Jaccard overlap threshold for grouping functions in HTML plugin */
export const OVERLAP_THRESHOLD = 0.7;
