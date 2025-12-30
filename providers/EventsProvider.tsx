"use client";

import { createContext, useContext, ReactNode } from "react";
import { useEvents } from "@/hooks/useEvents";
import type { AttackEvent, Summary } from "@/types";

interface EventsContextType {
  events: AttackEvent[];
  summary: Summary | null;
  loading: boolean;
  error: Error | null;
}

const EventsContext = createContext<EventsContextType | null>(null);

export function EventsProvider({ children }: { children: ReactNode }) {
  const { events, summary, loading, error } = useEvents();

  return (
    <EventsContext.Provider value={{ events, summary, loading, error }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEventsContext() {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error("useEventsContext must be used within EventsProvider");
  }
  return context;
}
