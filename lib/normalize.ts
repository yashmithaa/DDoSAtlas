import { RawEntry } from './feeds';

export interface NormalizedEvent {
  ip: string;
  source: string;
  reason: string;
  raw_score: null;
  timestamp: number;
}

export function normalizeEvents(rawEntries: RawEntry[]): NormalizedEvent[] {
  const now = Date.now();
  
  const normalized: NormalizedEvent[] = rawEntries.map(entry => ({
    ip: entry.ip,
    source: entry.source,
    reason: entry.reason,
    raw_score: null,
    timestamp: now,
  }));

  return normalized;
}

export function deduplicateEvents(events: NormalizedEvent[]): Map<string, NormalizedEvent[]> {
  const ipMap = new Map<string, NormalizedEvent[]>();

  for (const event of events) {
    const existing = ipMap.get(event.ip);
    if (existing) {
      existing.push(event);
    } else {
      ipMap.set(event.ip, [event]);
    }
  }

  return ipMap;
}
