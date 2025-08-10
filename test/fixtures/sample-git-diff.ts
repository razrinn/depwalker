// Sample git diff outputs for testing

export const SIMPLE_DIFF = `diff --git a/src/components/Button.tsx b/src/components/Button.tsx
index 1234567..abcdefg 100644
--- a/src/components/Button.tsx
+++ b/src/components/Button.tsx
@@ -10,0 +11,2 @@ export const Button = () => {
+  const handleClick = () => {
+    console.log('clicked');
@@ -20,1 +22,1 @@ export const Button = () => {
-  return <button>Old</button>;
+  return <button onClick={handleClick}>New</button>;`;

export const MULTIPLE_FILES_DIFF = `diff --git a/src/utils/helpers.ts b/src/utils/helpers.ts
index 2345678..bcdefgh 100644
--- a/src/utils/helpers.ts
+++ b/src/utils/helpers.ts
@@ -5,0 +6,3 @@ export const formatDate = (date: Date) => {
+export const formatTime = (date: Date) => {
+  return date.toLocaleTimeString();
+};
diff --git a/src/components/Header.tsx b/src/components/Header.tsx
index 3456789..cdefghi 100644
--- a/src/components/Header.tsx
+++ b/src/components/Header.tsx
@@ -15,1 +15,1 @@ export const Header = () => {
-  const title = 'Old Title';
+  const title = 'New Title';`;

export const NON_TS_FILES_DIFF = `diff --git a/README.md b/README.md
index 4567890..defghij 100644
--- a/README.md
+++ b/README.md
@@ -1,1 +1,1 @@
-# Old Title
+# New Title
diff --git a/package.json b/package.json
index 5678901..efghijk 100644
--- a/package.json
+++ b/package.json
@@ -5,1 +5,1 @@
-  "version": "1.0.0",
+  "version": "1.0.1",`;

export const EMPTY_DIFF = '';

export const MALFORMED_DIFF = `this is not a valid git diff
some random content
without proper structure`;

export const EXPECTED_PARSED_RESULTS = {
  SIMPLE_DIFF: new Map([
    ['src/components/Button.tsx', new Set([11, 12, 22])]
  ]),
  MULTIPLE_FILES_DIFF: new Map([
    ['src/utils/helpers.ts', new Set([6, 7, 8])],
    ['src/components/Header.tsx', new Set([15])]
  ]),
  NON_TS_FILES_DIFF: new Map(), // Should be empty as we only track .ts/.tsx files
  EMPTY_DIFF: new Map(),
};
