import type { IngestPayload } from "./types.js";

const DEFAULT_ENDPOINT = "https://52-70-105-56.sslip.io/v1/ingest";

export class Transport {
  constructor(
    private readonly apiKey: string,
    private readonly endpoint: string = DEFAULT_ENDPOINT,
  ) {}

  /** Best-effort send. Used for periodic/buffer-full flushes. */
  async send(payload: IngestPayload): Promise<void> {
    try {
      await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        // Don't let monitoring calls block navigation or hang indefinitely.
        keepalive: true,
      });
    } catch {
      // Swallow errors — losing a batch of telemetry should never break the host app.
    }
  }

  /**
   * Used on page unload. sendBeacon is fire-and-forget and survives the page
   * closing, unlike a normal fetch which may get cancelled mid-flight.
   */
  sendBeacon(payload: IngestPayload): void {
    if (typeof navigator === "undefined" || !navigator.sendBeacon) {
      // Fall back to a best-effort fetch if sendBeacon isn't supported.
      void this.send(payload);
      return;
    }

    // Note: sendBeacon can't set custom headers, so the API key travels in
    // the body for this path. The server should accept it there as a fallback.
    const body = JSON.stringify({ ...payload, apiKey: this.apiKey });
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(this.endpoint, blob);
  }
}
