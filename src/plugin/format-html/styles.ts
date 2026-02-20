// CSS styles for HTML format plugin

export const styles = `
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #fff;
  color: #1a1a1a;
  line-height: 1.6;
  padding: 40px 24px;
}

.container {
  max-width: 900px;
  margin: 0 auto;
}

/* Header */
.header {
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #111;
}

.header-meta {
  font-size: 13px;
  color: #6b7280;
}

/* Summary badges */
.summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 32px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.badge-dot.critical { background: #ef4444; }
.badge-dot.high { background: #f97316; }
.badge-dot.medium { background: #eab308; }
.badge-dot.low { background: #22c55e; }
.badge-dot.none { background: #9ca3af; }

/* Section titles */
.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #111;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f3f4f6;
}

/* Changed nodes */
.node-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.node-name {
  font-family: 'SF Mono', Monaco, 'Fira Code', monospace;
  font-size: 14px;
  font-weight: 600;
  color: #111;
}

.node-file {
  font-family: 'SF Mono', Monaco, 'Fira Code', monospace;
  font-size: 12px;
  color: #6b7280;
  margin-left: auto;
}

.impact-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.impact-badge.critical { background: #fef2f2; color: #dc2626; }
.impact-badge.high { background: #fff7ed; color: #ea580c; }
.impact-badge.medium { background: #fefce8; color: #ca8a04; }
.impact-badge.low { background: #f0fdf4; color: #16a34a; }
.impact-badge.none { background: #f9fafb; color: #9ca3af; }

/* Tree view */
.tree {
  padding: 12px 16px;
  font-family: 'SF Mono', Monaco, 'Fira Code', monospace;
  font-size: 13px;
}

.tree-node {
  position: relative;
}

.tree-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  cursor: default;
}

.tree-row:hover {
  background: #f9fafb;
  border-radius: 4px;
}

.tree-toggle {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #9ca3af;
  cursor: pointer;
  flex-shrink: 0;
  user-select: none;
}

.tree-label {
  color: #374151;
}

.tree-location {
  color: #9ca3af;
  font-size: 11px;
  margin-left: auto;
}

.tree-children {
  margin-left: 20px;
  padding-left: 12px;
  border-left: 1px solid #e5e7eb;
}

.tree-children.collapsed {
  display: none;
}

.tree-circular {
  color: #9ca3af;
  font-style: italic;
}

.no-deps {
  padding: 12px 16px;
  color: #9ca3af;
  font-size: 13px;
  font-style: italic;
}

/* Test targets */
.entry-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.entry-table th {
  text-align: left;
  padding: 8px 12px;
  font-weight: 600;
  color: #6b7280;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #e5e7eb;
}

.entry-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #f3f4f6;
}

.entry-table td:first-child {
  font-family: 'SF Mono', Monaco, 'Fira Code', monospace;
  font-weight: 500;
}

.entry-table tr:last-child td {
  border-bottom: none;
}

.entry-count {
  margin-top: 10px;
  font-size: 13px;
  color: #6b7280;
}
`;
