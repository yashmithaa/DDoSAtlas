"use client";

import { useEventsContext } from "@/providers";
import { Sidebar } from "@/components/layout";
import { GlobeView, MapSidebar } from "@/components/map";

export default function MapPage() {
  const { events, summary } = useEventsContext();

  return (
    <div className="flex h-[calc(100vh-120px)]">
      <div className="flex-1 relative overflow-hidden">
        <GlobeView events={events} />
      </div>
      <Sidebar>
        <MapSidebar summary={summary} events={events} />
      </Sidebar>
    </div>
  );
}
