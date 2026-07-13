import type { DebugFlowConfig, IngestPayload } from "./types.js";
import { EventBuffer } from "./buffer.js";
import { Transport } from "./transport.js";
import { getOrCreateSession } from "./session.js";
import { patchConsole } from "./console.js";
import { patchErrorHandlers } from "./errors.js";
import { patchFetch, patchAxios } from "./network.js";

const DEFAULT_STATUS_CODES = [500, 501, 502, 503, 504];

class DebugFlowSDK {
  private buffer?: EventBuffer;
  private transport?: Transport;
  private session?: ReturnType<typeof getOrCreateSession>;
  private flushTimer?: ReturnType<typeof setInterval>;
  private unpatchFns: Array<() => void> = [];
  private initialized = false;

  init(config: DebugFlowConfig) {
    if (this.initialized) {
      console.warn("[DebugFlow] init() called more than once — ignoring.");
      return;
    }
    if (!config.apiKey) {
      console.warn("[DebugFlow] init() requires an apiKey — SDK not started.");
      return;
    }
    if (typeof window === "undefined") {
      // SDK is browser-only; no-op during SSR.
      return;
    }

    this.initialized = true;
    this.session = getOrCreateSession();
    this.transport = new Transport(config.apiKey, config.endpoint);
    this.buffer = new EventBuffer(config.maxBufferSize ?? 150, () => this.flush());

    const networkOpts = {
      statusCodes: config.networkStatusCodes ?? DEFAULT_STATUS_CODES,
      captureRequestBody: config.captureRequestBody ?? false,
      captureResponseBody: config.captureResponseBody ?? false,
    };

    this.unpatchFns.push(
      patchConsole((event) => this.buffer!.addConsoleLog(event)),
      patchErrorHandlers(
        (event) => this.buffer!.addError(event),
        () => this.flush(), // flush immediately on a fatal error
      ),
      patchFetch((event) => this.buffer!.addNetworkLog(event), networkOpts),
    );

    this.flushTimer = setInterval(() => this.flush(), config.flushIntervalMs ?? 7000);

    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("pagehide", this.handlePageHide);
  }

  /**
   * Optionally instrument an axios instance the host app already created.
   * Call after init(). The SDK does not bundle axios itself.
   */
  instrumentAxios(axiosInstance: unknown, config?: Pick<DebugFlowConfig, "networkStatusCodes" | "captureRequestBody" | "captureResponseBody">) {
    if (!this.initialized || !this.buffer) {
      console.warn("[DebugFlow] instrumentAxios() called before init().");
      return;
    }
    this.unpatchFns.push(
      patchAxios(axiosInstance, (event) => this.buffer!.addNetworkLog(event), {
        statusCodes: config?.networkStatusCodes ?? DEFAULT_STATUS_CODES,
        captureRequestBody: config?.captureRequestBody ?? false,
        captureResponseBody: config?.captureResponseBody ?? false,
      }),
    );
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      this.flush(true);
    }
  };

  private handlePageHide = () => {
    this.flush(true);
  };

  private flush(useBeacon = false) {
    if (!this.buffer || !this.transport || !this.session || this.buffer.isEmpty()) return;

    const { consoleLogs, networkLogs, errors } = this.buffer.drain();
    const payload: IngestPayload = {
      session: { ...this.session, currentUrl: location.href },
      consoleLogs,
      networkLogs,
      errors,
    };

    if (useBeacon) {
      this.transport.sendBeacon(payload);
    } else {
      void this.transport.send(payload);
    }
  }

  /** Tears down all patches/listeners/timers. Mainly useful for tests. */
  destroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    window.removeEventListener("pagehide", this.handlePageHide);
    this.unpatchFns.forEach((fn) => fn());
    this.unpatchFns = [];
    this.initialized = false;
  }
}

const DebugFlow = new DebugFlowSDK();
export default DebugFlow;
