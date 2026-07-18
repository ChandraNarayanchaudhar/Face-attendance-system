// WebSocket hook — connects dashboard to live face recognition events

import { useEffect, useRef, useState } from "react";
import { WS_BASE } from "@/lib/config";

interface FaceDetectedEvent {
  student_id: string;
  name: string;
  confidence: number;
  status?: string;
  camera: string;
}

interface AttendanceMarkedEvent {
  student_id: string;
  status: string;
}

interface AlertEvent {
  type: string;
  message: string;
}

interface FeedEvent {
  id: string;
  label: string;
  tone: string;
  created_at: string;
}

interface WSEvent {
  type: string;
  data?: unknown;
  timestamp: string;
  message?: string;
}

interface UseWebSocketOptions {
  onFaceDetected?: (data: FaceDetectedEvent) => void;
  onAttendanceMarked?: (data: AttendanceMarkedEvent) => void;
  onAlert?: (data: AlertEvent) => void;
  onFeedEvent?: (data: FeedEvent) => void;
  onEvent?: (event: WSEvent) => void;
}

function buildWebSocketUrls() {
  const baseUrl = `${WS_BASE.replace(/\/$/, "")}/dashboard`;
  const rawUrls = [
    baseUrl,
    "ws://127.0.0.1:8000/ws/dashboard",
    "ws://localhost:8000/ws/dashboard",
  ];

  if (typeof window !== "undefined") {
    rawUrls.push(`ws://${window.location.hostname}:8000/ws/dashboard`);
  }

  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    rawUrls.push(...rawUrls.map((url) => url.replace(/^ws:/, "wss:")));
  }

  return Array.from(new Set(rawUrls));
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const wsRef = useRef<(WebSocket & { _pingInterval?: number }) | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const optionsRef = useRef<UseWebSocketOptions>(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    let attempt = 0;
    let mounted = true;
    const urls = buildWebSocketUrls();

    const cleanupWebSocket = () => {
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
    };

    const scheduleReconnect = (delay: number) => {
      if (!mounted) return;
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = window.setTimeout(() => {
        attempt = 0;
        connect(urls[0]);
      }, delay);
    };

    const connect = (url: string) => {
      cleanupWebSocket();

      try {
        console.log("🔌 Trying WebSocket", url);
        const ws = new WebSocket(url) as WebSocket & { _pingInterval?: number };
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mounted) return;
          setIsConnected(true);
          console.log("✅ WebSocket connected to live feed", url);
          ws._pingInterval = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 30000);
        };

        ws.onmessage = (event: MessageEvent<string>) => {
          try {
            const data = JSON.parse(event.data) as WSEvent;
            if (mounted) {
              setLastEvent(data);
            }

            const handlers = optionsRef.current;
            switch (data.type) {
              case "face_detected":
                handlers.onFaceDetected?.(data.data as FaceDetectedEvent);
                break;
              case "attendance_marked":
                handlers.onAttendanceMarked?.(
                  data.data as AttendanceMarkedEvent,
                );
                break;
              case "alert":
                handlers.onAlert?.(data.data as AlertEvent);
                break;
              case "feed_event":
                handlers.onFeedEvent?.(data.data as FeedEvent);
                break;
              default:
                handlers.onEvent?.(data);
                break;
            }
          } catch (error) {
            console.error("WS message parse error:", error);
          }
        };

        ws.onclose = (event: CloseEvent) => {
          if (!mounted) return;
          setIsConnected(false);
          if (ws._pingInterval) window.clearInterval(ws._pingInterval);
          console.warn("❌ WebSocket closed", {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            url,
          });

          if (attempt < urls.length - 1) {
            attempt += 1;
            const nextUrl = urls[attempt];
            console.log("🔁 Retrying WebSocket with fallback URL", nextUrl);
            window.setTimeout(() => connect(nextUrl), 500);
          } else {
            console.log("❌ WebSocket disconnected — reconnecting in 3s...");
            scheduleReconnect(3000);
          }
        };

        ws.onerror = (err: Event) => {
          console.error("WebSocket connection failed:", err, "url=", url);
          try {
            ws.close();
          } catch {}
        };
      } catch (e) {
        console.error("WebSocket connect exception:", e, "url=", url);
        if (attempt < urls.length - 1) {
          attempt += 1;
          window.setTimeout(() => connect(urls[attempt]), 500);
        } else {
          scheduleReconnect(5000);
        }
      }
    };

    connect(urls[attempt]);

    return () => {
      mounted = false;
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
      }
      cleanupWebSocket();
    };
  }, []);

  return { isConnected, lastEvent };
}
