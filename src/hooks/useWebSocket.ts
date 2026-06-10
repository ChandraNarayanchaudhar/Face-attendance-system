// WebSocket hook — connects dashboard to live face recognition events

import { useEffect, useRef, useState, useCallback } from "react";

interface WSEvent {
  type: string;
  data?: any;
  timestamp: string;
  message?: string;
}

interface UseWebSocketOptions {
  onFaceDetected?: (data: any) => void;
  onAttendanceMarked?: (data: any) => void;
  onAlert?: (data: any) => void;
  onFeedEvent?: (data: any) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      // Connect to FastAPI WebSocket endpoint
      const ws = new WebSocket("ws://localhost:8000/ws/dashboard");
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log("✅ WebSocket connected to live feed");
        // Start ping to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
        // Store interval id for cleanup
        (ws as any)._pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        try {
          const data: WSEvent = JSON.parse(event.data);
          setLastEvent(data);

          // Route event to correct handler
          switch (data.type) {
            case "face_detected":
              options.onFaceDetected?.(data.data);
              break;
            case "attendance_marked":
              options.onAttendanceMarked?.(data.data);
              break;
            case "alert":
              options.onAlert?.(data.data);
              break;
            case "feed_event":
              options.onFeedEvent?.(data.data);
              break;
            default:
              break;
          }
        } catch (e) {
          console.error("WS message parse error:", e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        clearInterval((ws as any)._pingInterval);
        console.log("❌ WebSocket disconnected — reconnecting in 3s...");
        // Auto reconnect after 3 seconds
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        ws.close();
      };
    } catch (e) {
      console.error("WebSocket connection failed:", e);
      // Retry after 5 seconds
      reconnectTimer.current = setTimeout(connect, 5000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      // Cleanup on unmount
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return { isConnected, lastEvent };
}
