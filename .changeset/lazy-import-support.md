---
"depwalker": minor
---

Add support for lazy import impact analysis

- Detect `lazy(() => import('...'))` and `React.lazy()` patterns
- Track lazy-loaded module dependencies
- Show impacted callers when lazy-loaded components change
- Display lazy imports in markdown and HTML reports
