import { NormalizedEvent } from './normalize';

export interface ScoredEvent extends NormalizedEvent {
  risk: number;
  score: number;
  feedCount: number;
}

//Calculate risk score for an IP based on threat type and feed count
function calculateRiskScore(events: NormalizedEvent[]): number {
  let baseScore = 0;

  // Base score from threat types - find the highest severity threat across all events
  for (const event of events) {
    const reason = event.reason.toLowerCase();
    let eventScore = 0;
    
    if (reason.includes('botnet') || reason.includes('c2')) {
      eventScore = 50;
    } else if (reason.includes('malware')) {
      eventScore = 40;
    } else if (reason.includes('scanner') || reason.includes('abuse')) {
      eventScore = 30;
    } else if (reason.includes('spam')) {
      eventScore = 25;
    } else {
      eventScore = 20; 
    }
    
    // Track the highest severity
    baseScore = Math.max(baseScore, eventScore);
  }

  let feedBonus = 0;
  if (events.length > 1) {
    feedBonus = Math.min(40, 10 * (events.length - 1));
  }

  const totalScore = baseScore + feedBonus;
  
  return Math.min(100, Math.max(0, totalScore));
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
