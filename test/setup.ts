import { vi } from 'vitest';

// Store original methods
const originalStdoutWrite = process.stdout.write;

// Global setup
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Restore original methods after each test
  process.stdout.write = originalStdoutWrite;
  vi.restoreAllMocks();
});
