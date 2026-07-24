export type Environment = "production" | "staging" | "development";

export interface DebugFlowConfig {
  apiKey: string;
  environment?: Environment;
  /** Ingestion endpoint. Defaults to the hosted DebugFlow API. */
  endpoint?: string;
  /** How often to flush the buffer, in ms. Default 7000. */
  flushIntervalMs?: number;
  /** Flush once this many events have buffered. Default 150. */
  maxBufferSize?: number;
  /** HTTP status codes to record for network requests. Default [500,501,502,503,504]. */
  networkStatusCodes?: number[];
  /** Capture request/response bodies for network logs. Default false (avoid leaking sensitive data). */
  captureRequestBody?: boolean;
  captureResponseBody?: boolean;

  // >>> CHANGED — added for session replay (this request) <
  /**
   * Error-triggered session replay: keeps a rolling ~30s buffer of DOM
   * activity and ships it (plus ~15s after) only when a fatal JS error
   * fires. Default true. All input field values are masked by default.
   */
  enableReplay?: boolean;

  // >>> CHANGED — added later, for the separate "disable console logging"
  // request, not part of the replay work — included here just because
  // it's already in the live file <
  /**
   * Capture console.* calls at all. Default true. Set to false to stop
   * shipping console logs entirely — useful if a client's traffic is high
   * enough that continuous console logging is generating more data than
   * it's worth (console logs are usually the largest single contributor
   * to storage volume, since every console.log call becomes a row).
   */
  captureConsole?: boolean;
  /**
   * If captureConsole is on, restrict it to just these levels. Default is
   * all levels (log/info/warn/error/debug). Setting this to e.g.
   * ["warn", "error"] keeps the console logs that usually matter for
   * debugging while dropping routine log/info/debug noise, which is
   * typically the bulk of console log volume.
   */
  consoleLevels?: Array<"log" | "info" | "warn" | "error" | "debug">;
}

export interface SessionInfo {
  id: string;
  browser?: string;
  os?: string;
  deviceType?: string;
  screenRes?: string;
  timezone?: string;
  language?: string;
  currentUrl?: string;
  referrer?: string;
}

export interface ConsoleLogEvent {
  level: "log" | "info" | "warn" | "error" | "debug";
  message: string;
  url?: string;
  timestamp: number;
}

export interface NetworkLogEvent {
  method: string;
  url: string;
  statusCode: number;
  durationMs?: number;
  requestBody?: string;
  responseBody?: string;
  timestamp: number;
}

export interface ErrorLogEvent {
  message: string;
  stackTrace?: string;
  file?: string;
  line?: number;
  column?: number;
  timestamp: number;
}

export interface IngestPayload {
  session: SessionInfo;
  consoleLogs: ConsoleLogEvent[];
  networkLogs: NetworkLogEvent[];
  errors: ErrorLogEvent[];
}
