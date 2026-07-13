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
