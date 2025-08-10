import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Spinner } from '../../src/ui.js';

describe('UI Components', () => {
  let spinner: Spinner;
  let mockStdoutWrite: any;
  let originalWrite: any;

  beforeEach(() => {
    // Store original stdout.write
    originalWrite = process.stdout.write;
    
    // Create a proper mock function
    mockStdoutWrite = vi.fn(() => true); // stdout.write returns boolean
    
    // Replace stdout.write with our mock
    process.stdout.write = mockStdoutWrite as any;
    
    // Mock timers for spinner testing
    vi.useFakeTimers();
    
    spinner = new Spinner('dots', 'Testing spinner');
  });

  afterEach(() => {
    // Clean up any running spinners
    if (spinner) {
      spinner.stop();
    }
    
    // Restore original stdout.write
    process.stdout.write = originalWrite;
    
    // Restore real timers
    vi.useRealTimers();
  });

  describe('Spinner', () => {
    it('should initialize with correct parameters', () => {
      const testSpinner = new Spinner('dots', 'Test message');
      expect(testSpinner).toBeDefined();
    });

    it('should start spinner', () => {
      expect(() => {
        spinner.start();
        spinner.stop();
      }).not.toThrow();
    });

    it('should call stdout.write when succeed is called', () => {
      spinner.succeed('Success message');
      expect(mockStdoutWrite).toHaveBeenCalled();
      
      // Check that the output contains the success icon and message
      const calls = mockStdoutWrite.mock.calls;
      const outputText = calls.map((call: any) => call[0]).join('');
      expect(outputText).toContain('Success message');
    });

    it('should call stdout.write when fail is called', () => {
      spinner.fail('Error message');
      expect(mockStdoutWrite).toHaveBeenCalled();
      
      // Check that the output contains the error message
      const calls = mockStdoutWrite.mock.calls;
      const outputText = calls.map((call: any) => call[0]).join('');
      expect(outputText).toContain('Error message');
    });

    it('should call stdout.write when warn is called', () => {
      spinner.warn('Warning message');
      expect(mockStdoutWrite).toHaveBeenCalled();
      
      // Check that the output contains the warning message
      const calls = mockStdoutWrite.mock.calls;
      const outputText = calls.map((call: any) => call[0]).join('');
      expect(outputText).toContain('Warning message');
    });

    it('should call stdout.write when info is called', () => {
      spinner.info('Info message');
      expect(mockStdoutWrite).toHaveBeenCalled();
      
      // Check that the output contains the info message
      const calls = mockStdoutWrite.mock.calls;
      const outputText = calls.map((call: any) => call[0]).join('');
      expect(outputText).toContain('Info message');
    });

    it('should update text without throwing', () => {
      expect(() => {
        spinner.updateText('Updated text');
      }).not.toThrow();
    });

    it('should use default spinner type when none provided', () => {
      const defaultSpinner = new Spinner();
      expect(defaultSpinner).toBeDefined();
      
      // Should not throw when starting
      expect(() => {
        defaultSpinner.start();
        defaultSpinner.stop();
      }).not.toThrow();
    });

    it('should handle multiple start/stop cycles', () => {
      expect(() => {
        spinner.start();
        spinner.stop();
        spinner.start();
        spinner.stop();
      }).not.toThrow();
    });

    it('should clean up interval on stop', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      spinner.start();
      spinner.stop();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      
      clearIntervalSpy.mockRestore();
    });

    it('should handle spinner animation frames when started', () => {
      spinner.start();
      
      // Advance time to trigger animation frames
      vi.advanceTimersByTime(100); // More than the default dots interval (80ms)
      
      // Should have called stdout.write for the animation
      expect(mockStdoutWrite).toHaveBeenCalled();
      
      spinner.stop();
    });

    it('should handle stop when not started', () => {
      // Should not throw when stopping a spinner that wasn't started
      expect(() => {
        spinner.stop();
      }).not.toThrow();
    });

    it('should use provided text in animation', () => {
      const customSpinner = new Spinner('dots', 'Custom text');
      customSpinner.start();
      
      // Advance timers to trigger frame
      vi.advanceTimersByTime(100);
      
      // Check that custom text appears in output
      const calls = mockStdoutWrite.mock.calls;
      const outputText = calls.map((call: any) => call[0]).join('');
      expect(outputText).toContain('Custom text');
      
      customSpinner.stop();
    });

    it('should handle different spinner types', () => {
      const lineSpinner = new Spinner('line', 'Line spinner');
      expect(() => {
        lineSpinner.start();
        lineSpinner.stop();
      }).not.toThrow();
    });
  });
});
