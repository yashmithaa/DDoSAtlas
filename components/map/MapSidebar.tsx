import type { Summary, AttackEvent } from "@/types";
import { DISPLAY_LIMITS } from "@/constants";
import { Card, CardHeader } from "@/components/ui";
import { CountryListCard } from "@/components/statistics";
import { EventListCard } from "@/components/events";

interface LiveStatsProps {
  total: number;
  activeEvents: number;
}

function LiveStats({ total, activeEvents }: LiveStatsProps) {
  return (
    <Card className="p-3 sm:p-4">
      <CardHeader className="mb-2 sm:mb-3">Live Statistics</CardHeader>
      <div className="space-y-2 sm:space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] sm:text-xs text-gray-400">Total Attacks</span>
          <span className="text-base sm:text-lg font-bold text-white">
            {total.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] sm:text-xs text-gray-400">Active Events</span>
          <span className="text-base sm:text-lg font-bold text-blue-400">{activeEvents}</span>
        </div>
      </div>
    </Card>
  );
}

interface MapSidebarProps {
  summary: Summary | null;
  events: AttackEvent[];
}

export function MapSidebar({ summary, events }: MapSidebarProps) {
  return (
    <>
      <LiveStats
        total={summary?.total || 0}
        activeEvents={events.length}
      />
      
      {summary?.topCountries && (
        <CountryListCard
          countries={summary.topCountries}
          total={summary.total}
          limit={DISPLAY_LIMITS.TOP_COUNTRIES}
          compact
        />
      )}
      
      <EventListCard
        events={events}
        limit={DISPLAY_LIMITS.SIDEBAR_EVENTS}
        compact
      />
    </>
  );
}
