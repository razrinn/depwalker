// CSS styles for HTML format plugin

export const styles = `
/* ============================================
   DEPWALKER - Modern Premium Design
   Black/Green Cyberpunk Aesthetic
   ============================================ */

:root {
  /* Core Colors - Black/Green Theme */
  --bg-primary: #050505;
  --bg-secondary: #0a0a0a;
  --bg-tertiary: #111111;
  --bg-elevated: #161616;
  --bg-hover: #1a1a1a;
  --bg-active: #222222;
  
  /* Green Accent Palette */
  --green-50: #e6fff0;
  --green-100: #b3ffd9;
  --green-200: #00ff41;
  --green-300: #00d936;
  --green-400: #00b32d;
  --green-500: #008f24;
  --green-glow: rgba(0, 255, 65, 0.4);
  --green-subtle: rgba(0, 255, 65, 0.08);
  
  /* Impact Colors */
  --critical: #ff4444;
  --critical-glow: rgba(255, 68, 68, 0.4);
  --critical-subtle: rgba(255, 68, 68, 0.1);
  --high: #ff8833;
  --high-glow: rgba(255, 136, 51, 0.4);
  --high-subtle: rgba(255, 136, 51, 0.1);
  --medium: #ffcc00;
  --medium-glow: rgba(255, 204, 0, 0.4);
  --medium-subtle: rgba(255, 204, 0, 0.1);
  --low: #00ff41;
  --low-glow: rgba(0, 255, 65, 0.4);
  --low-subtle: rgba(0, 255, 65, 0.1);
  --none: #666666;
  
  /* Text Colors */
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --text-tertiary: #666666;
  --text-muted: #444444;
  
  /* Borders */
  --border-primary: #222222;
  --border-secondary: #2a2a2a;
  --border-hover: #333333;
  
  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Monaco, 'Fira Code', monospace;
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  
  /* Radii */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.6);
  --shadow-glow: 0 0 20px var(--green-glow);
  
  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-base: 0.2s ease;
  --transition-slow: 0.3s ease;
}

/* ============================================
   BASE & RESET
   ============================================ */

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-sans);
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.5;
  min-height: 100vh;
  overflow: hidden;
}

.app {
  display: grid;
  grid-template-columns: 320px 1fr;
  height: 100vh;
  overflow: hidden;
}

@media (max-width: 1024px) {
  .app {
    grid-template-columns: 280px 1fr;
  }
}

@media (max-width: 768px) {
  .app {
    grid-template-columns: 1fr;
  }
}

/* ============================================
   SIDEBAR
   ============================================ */

.sidebar {
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.brand-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--green-200) 0%, var(--green-400) 100%);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #000;
  font-weight: 700;
  box-shadow: 0 0 16px var(--green-glow);
}

.brand-text h1 {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  line-height: 1.2;
}

.brand-text .version {
  font-size: 11px;
  color: var(--green-200);
  font-weight: 600;
  font-family: var(--font-mono);
}

.sidebar-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: var(--border-primary);
  border-bottom: 1px solid var(--border-primary);
}

.sidebar-stat {
  background: var(--bg-secondary);
  padding: var(--space-3) var(--space-4);
  text-align: center;
}

.sidebar-stat-value {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 600;
  line-height: 1;
  margin-bottom: var(--space-1);
}

.sidebar-stat-value.critical { color: var(--critical); text-shadow: 0 0 8px var(--critical-glow); }
.sidebar-stat-value.high { color: var(--high); text-shadow: 0 0 8px var(--high-glow); }
.sidebar-stat-value.medium { color: var(--medium); text-shadow: 0 0 8px var(--medium-glow); }
.sidebar-stat-value.low { color: var(--low); text-shadow: 0 0 8px var(--low-glow); }

.sidebar-stat-label {
  font-size: 10px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.sidebar-controls {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.search-box {
  position: relative;
}

.search-box input {
  width: 100%;
  padding: var(--space-3) var(--space-4) var(--space-3) 36px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 13px;
  font-family: var(--font-sans);
  transition: all var(--transition-fast);
}

.search-box::before {
  content: '';
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'/%3E%3C/svg%3E");
  background-size: contain;
  opacity: 0.6;
}

.search-box input:focus {
  outline: none;
  border-color: var(--green-200);
  box-shadow: 0 0 0 3px var(--green-subtle);
}

.search-box input::placeholder {
  color: var(--text-tertiary);
}

.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.filter-pill {
  padding: var(--space-1) var(--space-3);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 100px;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.filter-pill:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
  background: var(--bg-hover);
}

.filter-pill.active {
  background: var(--green-200);
  border-color: var(--green-200);
  color: #000;
  font-weight: 600;
}

.filter-pill[data-filter="critical"].active { background: var(--critical); border-color: var(--critical); color: #fff; }
.filter-pill[data-filter="high"].active { background: var(--high); border-color: var(--high); color: #000; }
.filter-pill[data-filter="medium"].active { background: var(--medium); border-color: var(--medium); color: #000; }
.filter-pill[data-filter="low"].active { background: var(--low); border-color: var(--low); color: #000; }

.function-list-header {
  padding: var(--space-3) var(--space-4);
  font-size: 11px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.function-list-header span {
  color: var(--green-200);
  font-family: var(--font-mono);
}

.function-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--space-3) var(--space-3);
}

.function-list::-webkit-scrollbar {
  width: 6px;
}

.function-list::-webkit-scrollbar-track {
  background: transparent;
}

.function-list::-webkit-scrollbar-thumb {
  background: var(--border-secondary);
  border-radius: 3px;
}

.function-list::-webkit-scrollbar-thumb:hover {
  background: var(--border-hover);
}

.function-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: 2px;
}

.function-item:hover {
  background: var(--bg-tertiary);
}

.function-item.active {
  background: var(--bg-elevated);
  box-shadow: inset 2px 0 0 var(--green-200);
}

.function-item.has-related {
  border-left: 2px solid var(--green-200);
}

.function-item.related-item {
  padding-left: var(--space-5);
  background: var(--bg-secondary);
  border-left: 2px solid var(--border-secondary);
  margin-left: var(--space-3);
  margin-right: var(--space-3);
  width: calc(100% - var(--space-6));
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

.function-item.related-item:hover {
  background: var(--bg-tertiary);
}

.related-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  background: var(--green-subtle);
  color: var(--green-200);
  font-size: 10px;
  font-weight: 600;
  border-radius: 100px;
  margin-left: var(--space-2);
  font-family: var(--font-mono);
}

.related-functions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-1);
}

.related-tag {
  font-size: 10px;
  padding: 1px 6px;
  background: var(--bg-elevated);
  color: var(--text-tertiary);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  border: 1px solid var(--border-secondary);
}

.impact-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor;
}

.impact-dot.critical { background: var(--critical); color: var(--critical); }
.impact-dot.high { background: var(--high); color: var(--high); }
.impact-dot.medium { background: var(--medium); color: var(--medium); }
.impact-dot.low { background: var(--low); color: var(--low); }
.impact-dot.none { background: var(--none); color: var(--none); }

.function-info {
  flex: 1;
  min-width: 0;
}

.function-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.function-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.function-badge {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--green-200);
  background: var(--green-subtle);
  padding: 2px 8px;
  border-radius: 100px;
  min-width: 28px;
  text-align: center;
}

/* ============================================
   MAIN CONTENT
   ============================================ */

.main-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-primary);
}

/* Top Stats Bar */
.stats-bar {
  display: flex;
  gap: var(--space-6);
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-secondary);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.stat-item-label {
  font-size: 11px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.stat-item-value {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Content Area */
.content-area {
  flex: 1;
  overflow: auto;
  padding: var(--space-6);
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: var(--space-6);
  max-width: 1600px;
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

/* ============================================
   CARDS
   ============================================ */

.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.card-header {
  padding: var(--space-5);
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.card-title-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.card-body {
  padding: var(--space-5);
}

/* ============================================
   FUNCTION DETAIL HEADER
   ============================================ */

.detail-header {
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  margin-bottom: var(--space-6);
  position: relative;
  overflow: hidden;
}

.detail-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--green-200) 0%, var(--green-400) 50%, transparent 100%);
}

.detail-header.critical::before { background: linear-gradient(90deg, var(--critical) 0%, transparent 100%); }
.detail-header.high::before { background: linear-gradient(90deg, var(--high) 0%, transparent 100%); }
.detail-header.medium::before { background: linear-gradient(90deg, var(--medium) 0%, transparent 100%); }
.detail-header.low::before { background: linear-gradient(90deg, var(--low) 0%, transparent 100%); }

.detail-header-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-6);
}

.detail-title-group {
  flex: 1;
  min-width: 0;
}

.detail-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
  letter-spacing: -0.02em;
  font-family: var(--font-mono);
}

.detail-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.detail-subtitle span {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.detail-badge {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 1px solid transparent;
}

.detail-badge.critical { 
  background: var(--critical-subtle); 
  color: var(--critical); 
  border-color: rgba(255, 68, 68, 0.3);
  box-shadow: 0 0 12px var(--critical-glow);
}
.detail-badge.high { 
  background: var(--high-subtle); 
  color: var(--high); 
  border-color: rgba(255, 136, 51, 0.3);
  box-shadow: 0 0 12px var(--high-glow);
}
.detail-badge.medium { 
  background: var(--medium-subtle); 
  color: var(--medium); 
  border-color: rgba(255, 204, 0, 0.3);
  box-shadow: 0 0 12px var(--medium-glow);
}
.detail-badge.low { 
  background: var(--low-subtle); 
  color: var(--low); 
  border-color: rgba(0, 255, 65, 0.3);
  box-shadow: 0 0 12px var(--low-glow);
}

/* ============================================
   TABS
   ============================================ */

.tabs {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-5);
  width: fit-content;
}

.tab {
  padding: var(--space-2) var(--space-4);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.tab:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.tab.active {
  background: var(--bg-elevated);
  color: var(--green-200);
  box-shadow: var(--shadow-sm);
}

.tab-content {
  display: none;
}

.tab-content.active {
  display: block;
}

/* ============================================
   TREE VIEW
   ============================================ */

.tree-container {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  min-height: 400px;
}

/* Shared Reference Node Styling */
.tree-content.shared-ref {
  background: var(--bg-elevated);
  border: 1px dashed var(--border-hover);
}

.tree-content.shared-ref .tree-label {
  color: var(--text-secondary);
  font-style: italic;
}

.shared-ref-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--green-subtle);
  color: var(--green-200);
  border-radius: var(--radius-sm);
  margin-left: var(--space-2);
  font-family: var(--font-mono);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.shared-ref-badge:hover {
  background: var(--green-200);
  color: #000;
}

.shared-ref-highlight {
  animation: sharedRefPulse 2s ease-in-out infinite;
}

@keyframes sharedRefPulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--green-glow); }
  50% { box-shadow: 0 0 0 4px var(--green-glow); }
}

.tree-node {
  position: relative;
}

.tree-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tree-content:hover {
  background: var(--bg-tertiary);
}

.tree-toggle {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 10px;
  flex-shrink: 0;
  transition: transform var(--transition-fast);
}

.tree-toggle.expanded::before { content: '▼'; }
.tree-toggle.collapsed::before { content: '▶'; }
.tree-toggle.leaf::before { content: '•'; color: var(--green-200); }

.tree-toggle.collapsed {
  transform: rotate(-90deg);
}

.tree-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.tree-label {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}

.tree-label.root {
  color: var(--green-200);
  font-weight: 600;
}

.tree-location {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-tertiary);
  margin-left: auto;
  flex-shrink: 0;
}

.tree-children {
  position: relative;
  margin-left: var(--space-5);
  padding-left: var(--space-3);
  border-left: 1px solid var(--border-secondary);
}

.tree-children.collapsed {
  display: none;
}

.entry-point-badge {
  font-size: 12px;
  margin-left: var(--space-1);
}

.tree-content.entry-point {
  background: var(--green-subtle);
}

.tree-content.entry-point .tree-label {
  color: var(--green-200);
}

/* ============================================
   GRAPH VIEW
   ============================================ */

.graph-wrapper {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 600px;
  position: relative;
}

/* Fullscreen Mode */
.graph-wrapper.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  border-radius: 0;
  border: none;
}

.graph-wrapper.fullscreen .graph-container {
  height: calc(100vh - 65px);
}

.graph-header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  background: var(--bg-tertiary);
}

.graph-controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.graph-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
}

.graph-btn:hover {
  border-color: var(--green-200);
  color: var(--green-200);
  background: var(--bg-hover);
}

.zoom-level {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 48px;
  text-align: center;
}

.graph-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  cursor: grab;
  background: var(--bg-primary);
}

.graph-container:active,
.graph-container.dragging {
  cursor: grabbing;
}

.graph-svg {
  width: 100%;
  height: 100%;
}

.graph-node rect {
  fill: var(--bg-tertiary);
  stroke-width: 1;
  rx: 6;
}

.graph-node:hover rect {
  stroke-width: 2;
  filter: drop-shadow(0 0 8px var(--green-glow));
}

.graph-node text {
  fill: var(--text-primary);
  font-size: 11px;
  font-family: var(--font-mono);
  pointer-events: none;
  dominant-baseline: middle;
}

.graph-node .node-file {
  fill: var(--text-tertiary);
  font-size: 9px;
}

.graph-link {
  fill: none;
  stroke: var(--border-secondary);
  stroke-width: 1.5;
  transition: all var(--transition-fast);
}

.graph-link.highlighted {
  stroke: var(--green-200);
  stroke-width: 2;
  stroke-dasharray: 5,3;
}

.graph-link.active {
  stroke: var(--green-200);
  stroke-width: 2.5;
}

.graph-link.dimmed {
  opacity: 0.1;
}

/* Convergence styling for multiple incoming edges */
.graph-link.converging {
  stroke-opacity: 0.6;
}

.graph-node.convergence-hub .node-convergence-badge {
  display: block;
}

.node-convergence-badge {
  display: none;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  fill: var(--green-200);
}

/* Edge hover effects */
.graph-link:hover {
  stroke: var(--green-200);
  stroke-width: 2.5;
  stroke-opacity: 1;
}

.graph-container:hover .graph-link:not(:hover):not(.active) {
  stroke-opacity: 0.3;
}

.graph-node.selected rect {
  stroke: var(--green-200);
  stroke-width: 2;
  filter: drop-shadow(0 0 12px var(--green-glow));
}

.graph-node.connected rect {
  stroke: var(--green-400);
  stroke-width: 1.5;
}

.graph-node.dimmed {
  opacity: 0.2;
}

.graph-node-root rect {
  stroke-width: 2;
  filter: drop-shadow(0 0 12px var(--green-glow));
}

/* Layer Panel */
.layer-panel {
  position: absolute;
  left: var(--space-4);
  top: var(--space-4);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  box-shadow: var(--shadow-md);
}

.layer-btn {
  padding: var(--space-2) var(--space-3);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-mono);
  text-align: center;
}

.layer-btn:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
}

.layer-btn.active {
  background: var(--green-200);
  border-color: var(--green-200);
  color: #000;
}

/* ============================================
   ENTRY POINTS PANEL
   ============================================ */

.entry-points-card {
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.entry-points-card.empty {
  opacity: 0.7;
}

.entry-points-header {
  padding: var(--space-5);
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.entry-points-icon {
  width: 36px;
  height: 36px;
  background: var(--green-subtle);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.entry-points-title {
  flex: 1;
}

.entry-points-title h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.entry-points-title p {
  font-size: 12px;
  color: var(--text-secondary);
}

.entry-points-count {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 600;
  color: var(--green-200);
}

.entry-points-content {
  padding: var(--space-4);
  max-height: 400px;
  overflow-y: auto;
}

.entry-point-file {
  margin-bottom: var(--space-4);
}

.entry-point-file:last-child {
  margin-bottom: 0;
}

.entry-point-file-path {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  border-left: 2px solid var(--green-200);
}

.entry-point-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding-left: var(--space-2);
}

.entry-point-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-family: var(--font-mono);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.entry-point-tag:hover {
  transform: translateY(-1px);
}

.entry-point-tag small {
  font-size: 10px;
  opacity: 0.7;
}

.entry-point-tag.priority-high {
  background: var(--critical-subtle);
  color: var(--critical);
  border-color: rgba(255, 68, 68, 0.3);
}

.entry-point-tag.priority-medium {
  background: var(--medium-subtle);
  color: var(--medium);
  border-color: rgba(255, 204, 0, 0.3);
}

.entry-point-tag.priority-low {
  background: var(--low-subtle);
  color: var(--low);
  border-color: rgba(0, 255, 65, 0.3);
}

/* ============================================
   EMPTY STATE
   ============================================ */

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-10);
  text-align: center;
  color: var(--text-secondary);
  min-height: 300px;
}

.empty-state-icon {
  width: 64px;
  height: 64px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-bottom: var(--space-5);
  color: var(--green-200);
  box-shadow: 0 0 24px var(--green-subtle);
}

.empty-state h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.empty-state p {
  font-size: 13px;
  color: var(--text-secondary);
  max-width: 300px;
}

/* ============================================
   LAZY IMPORTS
   ============================================ */

.lazy-imports-section {
  margin-top: var(--space-5);
  padding-top: var(--space-5);
  border-top: 1px solid var(--border-primary);
}

.lazy-imports-title {
  font-size: 11px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  margin-bottom: var(--space-3);
}

.lazy-imports-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.lazy-import-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-secondary);
}

.lazy-import-tag span {
  color: var(--text-tertiary);
}

/* Related Functions Section in Detail View */
.related-functions-section {
  margin-top: var(--space-5);
  padding: var(--space-4);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
}

.related-functions-title {
  font-size: 11px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  margin-bottom: var(--space-3);
}

.related-functions-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.related-function-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
}

.related-function-btn:hover {
  border-color: var(--green-200);
  background: var(--bg-hover);
}

.related-function-btn.active {
  border-color: var(--green-200);
  background: var(--green-subtle);
}

.rf-name {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.rf-line {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.rf-badge {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  font-weight: 600;
}

.rf-badge.critical { background: var(--critical-subtle); color: var(--critical); }
.rf-badge.high { background: var(--high-subtle); color: var(--high); }
.rf-badge.medium { background: var(--medium-subtle); color: var(--medium); }
.rf-badge.low { background: var(--low-subtle); color: var(--low); }

/* ============================================
   SCROLLBAR STYLING
   ============================================ */

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--border-secondary);
  border-radius: 4px;
  border: 2px solid var(--bg-secondary);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--border-hover);
}

/* ============================================
   SELECTION STYLING
   ============================================ */

::selection {
  background: var(--green-subtle);
  color: var(--green-200);
}
`;
