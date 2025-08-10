import * as ts from 'typescript';
import * as path from 'path';

// Mock TypeScript source files for testing
export const SAMPLE_BUTTON_COMPONENT = `
import React from 'react';

export const Button = ({ onClick, children }: { onClick: () => void; children: string }) => {
  const handleClick = () => {
    console.log('Button clicked');
    onClick();
  };

  return <button onClick={handleClick}>{children}</button>;
};

export const IconButton = ({ icon, onClick }: { icon: string; onClick: () => void }) => {
  return <button onClick={onClick}>{icon}</button>;
};
`;

export const SAMPLE_UTILS_FILE = `
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString();
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString();
};

export const API_BASE_URL = 'https://api.example.com';

export const fetchData = async (endpoint: string) => {
  const url = \`\${API_BASE_URL}/\${endpoint}\`;
  return fetch(url);
};
`;

export const SAMPLE_HEADER_COMPONENT = `
import React from 'react';
import { formatDate } from './utils';
import { Button } from './Button';

export const Header = () => {
  const now = new Date();
  const formattedDate = formatDate(now);
  
  const handleMenuClick = () => {
    console.log('Menu clicked');
  };

  return (
    <header>
      <h1>My App - {formattedDate}</h1>
      <Button onClick={handleMenuClick}>Menu</Button>
    </header>
  );
};
`;

// Helper to create mock source files
export function createMockSourceFile(content: string, fileName: string): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
}

// Mock file system for TypeScript program
export const MOCK_FILES = {
  'src/components/Button.tsx': SAMPLE_BUTTON_COMPONENT,
  'src/components/Header.tsx': SAMPLE_HEADER_COMPONENT,
  'src/utils/helpers.ts': SAMPLE_UTILS_FILE,
};

// Create a mock TypeScript program for testing
export function createMockProgram(): ts.Program {
  const files = Object.keys(MOCK_FILES);
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.React,
    strict: true,
  };

  const host: ts.CompilerHost = {
    getSourceFile: (fileName: string) => {
      const content = MOCK_FILES[fileName as keyof typeof MOCK_FILES];
      if (content) {
        return createMockSourceFile(content, fileName);
      }
      return undefined;
    },
    writeFile: () => {},
    getCurrentDirectory: () => process.cwd(),
    getDirectories: () => [],
    fileExists: (fileName: string) => fileName in MOCK_FILES,
    readFile: (fileName: string) => MOCK_FILES[fileName as keyof typeof MOCK_FILES],
    getCanonicalFileName: (fileName: string) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    resolveModuleNames: () => [],
    getDefaultLibFileName: (options: ts.CompilerOptions) => 'lib.d.ts',
  };

  return ts.createProgram(files, options, host);
}
