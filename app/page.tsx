"use client";

import { useEventsContext } from "@/providers";
import { Sidebar } from "@/components/layout";
import { GlobeView, MapSidebar } from "@/components/map";

export default function MapPage() {
  const { events, summary } = useEventsContext();

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] sm:h-[calc(100vh-100px)] lg:h-[calc(100vh-120px)]">
      <div className="flex-1 relative overflow-hidden min-h-[300px] sm:min-h-[400px] lg:min-h-0">
        <GlobeView events={events} />
      </div>
      <Sidebar>
        <MapSidebar summary={summary} events={events} />
      </Sidebar>
    </div>
  );
}
