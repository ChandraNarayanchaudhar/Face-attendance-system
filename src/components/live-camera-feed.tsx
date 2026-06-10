"use client";

// Live camera feed component — shows face detection events from WebSocket

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWebSocket } from "@/hooks/useWebSocket";

interface DetectedFace {
  student_id: string;
  name: string;
  confidence: number;
  status: string;
  camera: string;
  time: string;
}

export function LiveCameraFeed() {
  // List of recently detected faces
  const [detectedFaces, setDetectedFaces] = React.useState<DetectedFace[]>([]);
  // Current face being shown large
  const [currentFace, setCurrentFace] = React.useState<DetectedFace | null>(
    null,
  );

  // Connect to WebSocket for live events
  const { isConnected } = useWebSocket({
    onFaceDetected: (data) => {
      // New face detected by camera
      const face: DetectedFace = {
        student_id: data.student_id,
        name: data.name,
        confidence: data.confidence,
        status: data.status || "Detected",
        camera: data.camera,
        time: new Date().toLocaleTimeString(),
      };
      // Show as current face
      setCurrentFace(face);
      // Add to recent list
      setDetectedFaces((prev) => [face, ...prev].slice(0, 10));
    },

    onAttendanceMarked: (data) => {
      // Attendance was just marked — update face status
      setDetectedFaces((prev) =>
        prev.map((f) =>
          f.student_id === data.student_id ? { ...f, status: data.status } : f,
        ),
      );
    },
  });

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          📷 Live Camera Feed
        </CardTitle>
        {/* Connection status indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
          />
          <span className="text-xs text-muted-foreground">
            {isConnected ? "Live" : "Connecting..."}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current detected face — big display */}
        {currentFace ? (
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">{currentFace.name}</div>
                <div className="text-sm text-muted-foreground">
                  📷 {currentFace.camera} • {currentFace.time}
                </div>
                <div className="text-sm text-muted-foreground">
                  Confidence: {Math.round(currentFace.confidence * 100)}%
                </div>
              </div>
              <div className="text-right">
                {/* Status badge */}
                <Badge
                  variant={
                    currentFace.status === "Present"
                      ? "success"
                      : currentFace.status === "Late"
                        ? "warning"
                        : currentFace.status === "Absent"
                          ? "destructive"
                          : "default"
                  }
                >
                  {currentFace.status}
                </Badge>
                {/* Confidence bar */}
                <div className="mt-2 h-2 w-24 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{ width: `${currentFace.confidence * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {isConnected
              ? "👁️ Watching for faces..."
              : "📷 Connecting to camera system..."}
          </div>
        )}

        {/* Recent detections list */}
        {detectedFaces.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              RECENT DETECTIONS
            </div>
            {detectedFaces.map((face, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border bg-background px-3 py-2"
              >
                <div>
                  <span className="text-sm font-medium">{face.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {face.time}
                  </span>
                </div>
                <Badge
                  variant={
                    face.status === "Present"
                      ? "success"
                      : face.status === "Late"
                        ? "warning"
                        : face.status === "Absent"
                          ? "destructive"
                          : "default"
                  }
                  className="text-xs"
                >
                  {face.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
