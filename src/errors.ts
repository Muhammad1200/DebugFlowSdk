import type { ErrorLogEvent } from "./types.js";

export function patchErrorHandlers(
  onEvent: (event: ErrorLogEvent) => void,
  onFatal: () => void,
): () => void {
  const onWindowError = (event: ErrorEvent) => {
    onEvent({
      message: event.message,
      stackTrace: event.error?.stack,
      file: event.filename,
      line: event.lineno,
      column: event.colno,
      timestamp: Date.now(),
    });
    onFatal();
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    onEvent({
      message: reason?.message ?? String(reason),
      stackTrace: reason?.stack,
      timestamp: Date.now(),
    });
    onFatal();
  };

  window.addEventListener("error", onWindowError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);

  return () => {
    window.removeEventListener("error", onWindowError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
  };
}
