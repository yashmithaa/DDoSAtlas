"use client";

import { useEventsContext } from "@/providers";
import { PageContainer } from "@/components/layout";
import { StatCard, Card, CardHeader } from "@/components/ui";
import { CountryListCard } from "@/components/statistics";
import { EventList } from "@/components/events";
import { DISPLAY_LIMITS } from "@/constants";

export default function StatisticsPage() {
  const { events, summary } = useEventsContext();

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Total Detections"
            value={summary?.total.toLocaleString() || 0}
            color="green"
          />
          <StatCard
            label="Active Events"
            value={events.length}
            color="blue"
          />
          <StatCard
            label="Countries Affected"
            value={summary?.topCountries.length || 0}
            color="orange"
          />
        </div>

        {/* Top Countries */}
        {summary?.topCountries && (
          <CountryListCard
            countries={summary.topCountries}
            total={summary.total}
            title="Most Attacked Countries"
          />
        )}

        {/* Recent Attacks */}
        <Card className="p-6">
          <CardHeader className="text-xl mb-6">Recent Attack Events</CardHeader>
          <EventList events={events} limit={DISPLAY_LIMITS.RECENT_EVENTS} />
        </Card>
      </div>
    </PageContainer>
  );
}
