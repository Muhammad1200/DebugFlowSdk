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
    /**
     * Error-triggered session replay: keeps a rolling ~30s buffer of DOM
     * activity and ships it (plus ~15s after) only when a fatal JS error
     * fires. Default true. All input field values are masked by default.
     */
    enableReplay?: boolean;
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

declare class DebugFlowSDK {
    private buffer?;
    private transport?;
    private session?;
    private flushTimer?;
    private unpatchFns;
    private replayRecorder?;
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
