// Simple terminal spinner for CLI progress indication

export class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private interval: NodeJS.Timeout | null = null;
  private frameIndex = 0;
  private text: string;

  constructor(text: string) {
    this.text = text;
  }

  updateText(text: string): void {
    this.text = text;
  }

  start(): void {
    process.stdout.write('\x1B[?25l');
    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      process.stdout.write(`\r\x1b[36m${frame}\x1b[0m ${this.text}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }

  succeed(text?: string): void {
    this.stop();
    console.log(`\r\x1b[32m✓\x1b[0m ${text || this.text}`);
  }

  fail(text?: string): void {
    this.stop();
    console.log(`\r\x1b[31m✗\x1b[0m ${text || this.text}`);
  }

  info(text?: string): void {
    this.stop();
    console.log(`\r\x1b[36mℹ\x1b[0m ${text || this.text}`);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write('\r\x1B[K');
    process.stdout.write('\x1B[?25h');
  }
}
