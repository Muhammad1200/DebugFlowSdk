import type { ConsoleLogEvent } from "./types.js";

const LEVELS = ["log", "info", "warn", "error", "debug"] as const;
type Level = (typeof LEVELS)[number];

function stringifyArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
}

/**
 * Wraps console.{log,info,warn,error,debug}, forwarding every call to
 * `onEvent` while still calling through to the original method so devtools
 * behave normally.
 */
export function patchConsole(onEvent: (event: ConsoleLogEvent) => void): () => void {
  const originals: Partial<Record<Level, (...args: unknown[]) => void>> = {};

  for (const level of LEVELS) {
    originals[level] = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      originals[level]!(...args);
      try {
        onEvent({
          level,
          message: stringifyArgs(args),
          url: typeof location !== "undefined" ? location.href : undefined,
          timestamp: Date.now(),
        });
      } catch {
        // Never let instrumentation break the host app's logging.
      }
    };
  }

  // Returns a restore function in case the host app needs to unpatch.
  return () => {
    for (const level of LEVELS) {
      if (originals[level]) console[level] = originals[level]!;
    }
  };
}
