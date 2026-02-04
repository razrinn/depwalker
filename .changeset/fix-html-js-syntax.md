---
"depwalker": patch
---

Fix JavaScript syntax errors in HTML report generation

- Remove duplicate `renderedNodes` variable declaration causing redeclaration error
- Fix escaped single quotes (`\'`) in onclick handlers causing "Unexpected string" syntax error
- Tree view and graph view now render correctly in HTML output
