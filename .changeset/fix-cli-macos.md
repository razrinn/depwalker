---
"depwalker": patch
---

Fix CLI not parsing arguments on macOS due to import.meta.url symlink mismatch

The `import.meta.url === \`file://\${process.argv[1]}\`` check fails on macOS
because `import.meta.url` resolves symlinks (e.g., `/private/tmp`) while 
`process.argv[1]` doesn't (e.g., `/tmp`). This caused the CLI to silently exit
without parsing arguments when installed from npm.

Removed the check entirely and now call `cli.parse()` unconditionally, following
the pattern used by Vite and other popular CLI tools.
