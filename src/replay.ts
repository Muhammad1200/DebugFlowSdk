import { record } from "rrweb";
import type { eventWithTime } from "@rrweb/types";
import { API_ENDPOINTS } from "./endpoints.js";

// How far back the rolling buffer reaches. rrweb's checkoutEveryNms forces
// a full DOM snapshot on this interval, and the buffer resets to start at
// each snapshot — so at any moment the buffer holds "since the last
// snapshot," which is between 0 and this many ms. Set to 30s per the
// product decision: capture ~30s of context before an error.
const CHECKOUT_INTERVAL_MS = 30_000;

// After an error fires, keep recording this much longer before flushing —
// captures what happens immediately after the error too (e.g. does the
// page recover, does the user retry, does it error again).
const POST_ERROR_CAPTURE_MS = 15_000;

interface ReplayPayload {
    sessionId: string;
    startedAt: number;
    endedAt: number;
    events: eventWithTime[];
}

export class ReplayRecorder {
    private buffer: eventWithTime[] = [];
    private bufferStartedAt: number = Date.now();
    private stopFn: (() => void) | undefined;
    private captureInFlight = false;
    private endpoint: string;
    private apiKey: string;
    private sessionId: string;

    constructor(apiKey: string, endpoint: string | undefined, sessionId: string) {
        // const base = (endpoint ?? API_ENDPOINTS).replace(/\/$/, "");
        this.endpoint = API_ENDPOINTS?.replay;  //`${base}/v1/replay`;
        this.apiKey = apiKey;
        this.sessionId = sessionId;
    }

    start() {
        if (typeof window === "undefined" || this.stopFn) return;

        try {
            this.stopFn = record({
                emit: (event, isCheckout) => {
                    if (isCheckout) {
                        // Fresh full snapshot — safe to discard everything before it,
                        // since a replay can only start from a checkout event anyway.
                        this.buffer = [];
                        this.bufferStartedAt = event.timestamp;
                    }
                    this.buffer.push(event);
                },
                checkoutEveryNms: CHECKOUT_INTERVAL_MS,
                maskAllInputs: true, // masks every input field's value by default
                blockClass: "df-no-record", // host app can opt specific elements out
                ignoreClass: "df-no-record",
                collectFonts: false,
            }) as (() => void) | undefined;
        } catch {
            // rrweb can throw in unusual DOM states (e.g. inside certain
            // sandboxed iframes) — replay is a bonus feature, never let it break
            // the host page.
        }
    }

    /**
     * Called when a fatal JS error fires. Waits POST_ERROR_CAPTURE_MS to
     * capture what happens right after the error too, then ships the whole
     * buffer (pre-error + post-error) as one recording.
     */
    captureOnError() {
        if (this.captureInFlight || this.buffer.length === 0) return;
        this.captureInFlight = true;

        setTimeout(() => {
            const payload: ReplayPayload = {
                sessionId: this.sessionId,
                startedAt: this.bufferStartedAt,
                endedAt: Date.now(),
                events: [...this.buffer],
            };

            this.send(payload);
            this.captureInFlight = false;
        }, POST_ERROR_CAPTURE_MS);
    }

    private send(payload: ReplayPayload) {
        try {
            fetch(this.endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(payload),
                // keepalive: true,
            }).catch(() => {
                // Best-effort — losing a replay recording should never surface to
                // the host app or affect its behavior.
            });
        } catch {
            // Synchronous throw path (e.g. fetch unavailable) — same principle.
        }
    }

    stop() {
        this.stopFn?.();
        this.stopFn = undefined;
        this.buffer = [];
    }
}