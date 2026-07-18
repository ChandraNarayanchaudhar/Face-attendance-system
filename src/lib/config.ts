const DEFAULT_API_URL = "/api";

function normalizeApiUrl(value: string) {
  try {
    const url = new URL(value, typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1");
    if (typeof window !== "undefined" && url.hostname === "0.0.0.0") {
      url.hostname = "127.0.0.1";
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.replace(/\/$/, "");
  }
}

export const API_BASE = typeof window !== "undefined"
  ? DEFAULT_API_URL
  : normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api");

export const WS_BASE = (() => {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (wsUrl) return wsUrl.replace(/\/$/, "");

  // In browser, connect directly to backend host on port 8000
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    // default backend port for WS in dev
    const port = process.env.NEXT_PUBLIC_WS_PORT || "8000";
    return `${proto}//${host}:${port}/ws`.replace(/\/$/, "");
  }

  // Server-side fallback
  return (process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000/ws").replace(/\/$/, "");
})();
