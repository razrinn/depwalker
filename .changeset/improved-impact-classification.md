---
"depwalker": minor
---

Improved impact classification system with depth-aware scoring

### New Features
- **5-Level Impact Classification**: Added "Critical" level (20+) alongside existing High (10-19), Medium (4-9), Low (1-3), and None (0)
- **Depth-Aware Scoring**: Impact score now considers both breadth (number of dependents) AND depth (call chain length)
- **New Formula**: `Score = Dependents + (Depth × 3)` - depth weighted more as deeper chains indicate systemic risk

### Changes
- Markdown reports now show impact score breakdown with dependents count and max chain depth
- HTML reports updated with Critical filter button and new color scheme (critical=red, high=orange)
- Increased view heights for better visibility (1600px fixed height, no viewport dependency)
- Both Tree and Graph views display score information in headers

### Impact Levels
| Level | Score | Description |
|-------|-------|-------------|
| 🔴 Critical | 20+ | Extreme impact - changes ripple through many levels |
| 🟠 High | 10-19 | Significant impact |
| 🟡 Medium | 4-9 | Moderate impact |
| 🟢 Low | 1-3 | Minimal impact |
| ⚪ None | 0 | No external callers |
