import type { AttackEvent } from "@/types";
import { Card, CardHeader, StatusIndicator } from "@/components/ui";

interface EventListProps {
  events: AttackEvent[];
  limit?: number;
  compact?: boolean;
}

export function EventList({ events, limit, compact = false }: EventListProps) {
  const displayEvents = limit
    ? events.slice(-limit).reverse()
    : events.slice().reverse();

  if (compact) {
    return (
      <div className="space-y-2">
        {displayEvents.map((event) => (
          <div
            key={event.id}
            className="text-xs py-2 px-2 bg-gray-800/30 rounded"
          >
            <div className="flex items-center gap-2 mb-1">
              <StatusIndicator score={event.score} size="sm" />
              <span className="font-mono text-gray-300">{event.ip}</span>
            </div>
            <div className="text-gray-500 ml-3.5">
              {event.country} • Score: {event.score}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {displayEvents.map((event) => (
        <div
          key={event.id}
          className="flex items-center justify-between py-2 px-3 bg-gray-800/30 rounded hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <StatusIndicator score={event.score} />
            <span className="font-mono text-sm text-gray-300">{event.ip}</span>
            <span className="text-sm text-gray-400">{event.country}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Score: {event.score}</span>
            <span className="text-xs text-gray-600">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

interface EventListCardProps {
  events: AttackEvent[];
  title?: string;
  limit?: number;
  compact?: boolean;
}

export function EventListCard({
  events,
  title = "Recent Activity",
  limit,
  compact = false,
}: EventListCardProps) {
  return (
    <Card className="p-4">
      <CardHeader className="mb-3">{title}</CardHeader>
      <EventList events={events} limit={limit} compact={compact} />
    </Card>
  );
}
