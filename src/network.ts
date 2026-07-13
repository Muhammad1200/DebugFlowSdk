import type { NetworkLogEvent } from "./types.js";

const SENSITIVE_KEYS = ["password", "token", "authorization", "cookie", "secret", "apikey", "api_key"];

/** Redacts obviously-sensitive fields before a body is ever sent to DebugFlow. */
function maskSensitive(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  try {
    const parsed = JSON.parse(raw);
    const mask = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(mask);
      if (obj && typeof obj === "object") {
        const out: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          out[key] = SENSITIVE_KEYS.includes(key.toLowerCase()) ? "[REDACTED]" : mask(value);
        }
        return out;
      }
      return obj;
    };
    return JSON.stringify(mask(parsed));
  } catch {
    // Not JSON — leave as-is rather than guessing at redaction on raw text.
    return raw;
  }
}

interface NetworkOptions {
  statusCodes: number[];
  captureRequestBody: boolean;
  captureResponseBody: boolean;
}

export function patchFetch(onEvent: (event: NetworkLogEvent) => void, opts: NetworkOptions): () => void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const start = performance.now();
    const [input, init] = args;
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? "GET";

    try {
      const response = await originalFetch(...args);

      if (opts.statusCodes.includes(response.status)) {
        let responseBody: string | undefined;
        if (opts.captureResponseBody) {
          try {
            responseBody = maskSensitive(await response.clone().text());
          } catch {
            // Body may not be readable (e.g. streamed) — skip rather than fail the request.
          }
        }

        onEvent({
          method,
          url,
          statusCode: response.status,
          durationMs: Math.round(performance.now() - start),
          requestBody: opts.captureRequestBody ? maskSensitive(init?.body as string) : undefined,
          responseBody,
          timestamp: Date.now(),
        });
      }

      return response;
    } catch (err) {
      // Network-level failure (offline, CORS, DNS, etc.) — treat as a 0 status.
      onEvent({
        method,
        url,
        statusCode: 0,
        durationMs: Math.round(performance.now() - start),
        timestamp: Date.now(),
      });
      throw err;
    }
  };

  return () => {
    window.fetch = originalFetch;
  };
}

/**
 * Optional axios interception. Call this only if the host app uses axios and
 * passes its instance in — the SDK doesn't bundle axios itself.
 */
export function patchAxios(axiosInstance: any, onEvent: (event: NetworkLogEvent) => void, opts: NetworkOptions): () => void {
  const requestId = axiosInstance.interceptors.request.use((config: any) => {
    config.__debugflowStart = performance.now();
    return config;
  });

  const responseId = axiosInstance.interceptors.response.use(
    (response: any) => {
      recordAxios(response.config, response.status, response, opts, onEvent);
      return response;
    },
    (error: any) => {
      const status = error.response?.status ?? 0;
      recordAxios(error.config ?? {}, status, error.response, opts, onEvent);
      return Promise.reject(error);
    },
  );

  return () => {
    axiosInstance.interceptors.request.eject(requestId);
    axiosInstance.interceptors.response.eject(responseId);
  };
}

function recordAxios(config: any, status: number, response: any, opts: NetworkOptions, onEvent: (event: NetworkLogEvent) => void) {
  if (!opts.statusCodes.includes(status)) return;

  const start = config?.__debugflowStart ?? performance.now();

  onEvent({
    method: (config?.method ?? "GET").toUpperCase(),
    url: config?.url ?? "",
    statusCode: status,
    durationMs: Math.round(performance.now() - start),
    requestBody: opts.captureRequestBody ? maskSensitive(safeStringify(config?.data)) : undefined,
    responseBody: opts.captureResponseBody ? maskSensitive(safeStringify(response?.data)) : undefined,
    timestamp: Date.now(),
  });
}

function safeStringify(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}
