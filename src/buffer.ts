import type { ConsoleLogEvent, ErrorLogEvent, NetworkLogEvent } from "./types.js";

export class EventBuffer {
  private consoleLogs: ConsoleLogEvent[] = [];
  private networkLogs: NetworkLogEvent[] = [];
  private errors: ErrorLogEvent[] = [];

  constructor(
    private readonly maxSize: number,
    private readonly onFull: () => void,
  ) {}

  addConsoleLog(event: ConsoleLogEvent) {
    this.consoleLogs.push(event);
    this.checkSize();
  }

  addNetworkLog(event: NetworkLogEvent) {
    this.networkLogs.push(event);
    this.checkSize();
  }

  addError(event: ErrorLogEvent) {
    this.errors.push(event);
    this.checkSize();
  }

  size(): number {
    return this.consoleLogs.length + this.networkLogs.length + this.errors.length;
  }

  isEmpty(): boolean {
    return this.size() === 0;
  }

  /** Returns and clears everything currently buffered. */
  drain() {
    const snapshot = {
      consoleLogs: this.consoleLogs,
      networkLogs: this.networkLogs,
      errors: this.errors,
    };
    this.consoleLogs = [];
    this.networkLogs = [];
    this.errors = [];
    return snapshot;
  }

  private checkSize() {
    if (this.size() >= this.maxSize) {
      this.onFull();
    }
  }
}
