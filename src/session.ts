import type { SessionInfo } from "./types.js";

function generateSessionId(): string {
  // crypto.randomUUID is available in all modern browsers; fall back just in case.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function detectDeviceType(ua: string): string {
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

const SESSION_STORAGE_KEY = "__debugflow_session_id";

export function getOrCreateSession(): SessionInfo {
  let id: string;
  try {
    id = sessionStorage.getItem(SESSION_STORAGE_KEY) ?? generateSessionId();
    sessionStorage.setItem(SESSION_STORAGE_KEY, id);
  } catch {
    // sessionStorage unavailable (privacy mode, SSR, etc.) — fall back to in-memory id
    id = generateSessionId();
  }

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

  return {
    id,
    browser: ua,
    os: typeof navigator !== "undefined" ? navigator.platform : undefined,
    deviceType: detectDeviceType(ua),
    screenRes: typeof screen !== "undefined" ? `${screen.width}x${screen.height}` : undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: typeof navigator !== "undefined" ? navigator.language : undefined,
    currentUrl: typeof location !== "undefined" ? location.href : undefined,
    referrer: typeof document !== "undefined" ? document.referrer : undefined,
  };
}
