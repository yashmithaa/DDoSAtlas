"use client";

import { useEffect, useState, useCallback } from "react";
import type { AttackEvent, Summary } from "@/types";
import { REFRESH_INTERVAL } from "@/constants";

interface UseEventsReturn {
  events: AttackEvent[];
  summary: Summary | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useEvents(): UseEventsReturn {
  const [events, setEvents] = useState<AttackEvent[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [eventsRes, summaryRes] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/summary"),
      ]);

      if (!eventsRes.ok || !summaryRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const eventsData = await eventsRes.json();
      const summaryData = await summaryRes.json();

      setEvents(eventsData);
      setSummary(summaryData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { events, summary, loading, error, refetch: fetchData };
}
