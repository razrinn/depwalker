import { MockedFunction } from 'vitest';

declare global {
  function mockStdout(): MockedFunction<any>;
}
