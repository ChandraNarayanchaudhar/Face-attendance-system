// Real time data hook — auto refreshes when WebSocket signals data change

import { useState, useEffect, useCallback } from "react";
import { apiGet } from "@/lib/api";

interface UseRealtimeOptions<T> {
  endpoint: string; // API endpoint to fetch
  refreshInterval?: number; // polling interval in ms (default 15s)
  onUpdate?: (data: T) => void;
}

export function useRealtime<T>({
  endpoint,
  refreshInterval = 15000,
  onUpdate,
}: UseRealtimeOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetch = useCallback(async () => {
    try {
      const result = await apiGet<T>(endpoint);
      setData(result);
      setLastUpdated(new Date());
      setError(null);
      onUpdate?.(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    // Initial fetch
    fetch();
    // Auto refresh every interval
    const interval = setInterval(fetch, refreshInterval);
    return () => clearInterval(interval);
  }, [fetch, refreshInterval]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setLoading(true);
    fetch();
  }, [fetch]);

  return { data, loading, error, lastUpdated, refresh };
}
