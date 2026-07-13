type Environment = "production" | "staging" | "development";
interface DebugFlowConfig {
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

declare class DebugFlowSDK {
    private buffer?;
    private transport?;
    private session?;
    private flushTimer?;
    private unpatchFns;
    private initialized;
    init(config: DebugFlowConfig): void;
    /**
     * Optionally instrument an axios instance the host app already created.
     * Call after init(). The SDK does not bundle axios itself.
     */
    instrumentAxios(axiosInstance: unknown, config?: Pick<DebugFlowConfig, "networkStatusCodes" | "captureRequestBody" | "captureResponseBody">): void;
    private handleVisibilityChange;
    private handlePageHide;
    private flush;
    /** Tears down all patches/listeners/timers. Mainly useful for tests. */
    destroy(): void;
}
declare const DebugFlow: DebugFlowSDK;

export { DebugFlow as default };
