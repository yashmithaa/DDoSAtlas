import { NormalizedEvent } from './normalize';

export interface ScoredEvent extends NormalizedEvent {
  // numeric risk value (0-100)
  risk: number;
  score: number;
  feedCount: number;
}

//Calculate risk score for an IP based on threat type and feed count
function calculateRiskScore(events: NormalizedEvent[]): number {
  let score = 0;

  // Base score from threat types
  for (const event of events) {
    const reason = event.reason.toLowerCase();
    
    if (reason.includes('botnet') || reason.includes('c2')) {
      score += 60;
    } else if (reason.includes('malware')) {
      score += 40;
    } else if (reason.includes('scanner') || reason.includes('abuse')) {
      score += 30;
    } else if (reason.includes('spam')) {
      score += 25;
    } else {
      score += 20; // Default for any malicious activity
    }
  }

  // Bonus for appearing in multiple feeds
  if (events.length > 1) {
    score += 20 * (events.length - 1);
  }

  // Clamp to 0-100 range
  return Math.min(100, Math.max(0, score));
}

//Score all events based on threat intelligence
export function scoreEvents(
  ipMap: Map<string, NormalizedEvent[]>
): Map<string, ScoredEvent> {
  const scored = new Map<string, ScoredEvent>();

  // Use Map.forEach to avoid downlevel iteration issues
  ipMap.forEach((eventsArr, ip) => {
    const risk = calculateRiskScore(eventsArr);

    const baseEvent = eventsArr[0];

    const uniqueReasons: string[] = [];
    const uniqueSources: string[] = [];

    for (const e of eventsArr) {
      if (!uniqueReasons.includes(e.reason)) uniqueReasons.push(e.reason);
      if (!uniqueSources.includes(e.source)) uniqueSources.push(e.source);
    }

    const combinedReason = uniqueReasons.join(', ');
    const combinedSource = uniqueSources.join(', ');

    scored.set(ip, {
      ...baseEvent,
      source: combinedSource,
      reason: combinedReason,
      risk,
      score: risk,
      feedCount: eventsArr.length,
    });
  });

  return scored;
}
