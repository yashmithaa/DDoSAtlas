import { fetchThreatFeeds } from './feeds';
import { normalizeEvents, deduplicateEvents } from './normalize';
import { scoreEvents } from './scoring';
import { geolocateBatch } from './geo';

export interface AttackEvent {
  id: string;
  ip: string;
  latitude: number;
  longitude: number;
  country: string;
  score: number;
  source: string;
  reason: string;
  timestamp: number;
}

const MAX_EVENTS = 500;
const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

// In-memory cache
let cachedEvents: AttackEvent[] = [];
let lastRefreshed: number = 0;
let isRefreshing = false;


async function buildEvents(): Promise<AttackEvent[]> {
  console.log('Building events from threat feeds...');
  
  // Fetch threat feeds
  const rawEntries = await fetchThreatFeeds();
  
  if (rawEntries.length === 0) {
    console.warn('No threat feed data available');
    return [];
  }

  // Normalize events
  const normalized = normalizeEvents(rawEntries);
  
  // Deduplicate and track multiple sources per IP
  const ipMap = deduplicateEvents(normalized);
  
  // Score events
  const scoredMap = scoreEvents(ipMap);
  
  // Sort by risk and take top entries
  const topIPs = Array.from(scoredMap.entries())
    .sort((a, b) => b[1].risk - a[1].risk)
    .slice(0, MAX_EVENTS)
    .map(([ip]) => ip);
  
  console.log(`Processing top ${topIPs.length} IPs for geolocation...`);
  
  // Geolocate IPs (with caching and rate limiting)
  const geoMap = await geolocateBatch(topIPs);
  
  // Build final events
  const events: AttackEvent[] = [];
  
  for (const ip of topIPs) {
    const scoredEvent = scoredMap.get(ip);
    const geo = geoMap.get(ip);
    
    if (scoredEvent && geo) {
      events.push({
        id: `evt_${Date.now()}_${ip.replace(/\./g, '_')}`,
        ip: scoredEvent.ip,
        latitude: geo.latitude,
        longitude: geo.longitude,
        country: geo.country,
        score: scoredEvent.risk,
        source: scoredEvent.source,
        reason: scoredEvent.reason,
        timestamp: scoredEvent.timestamp,
      });
    }
  }
  
  console.log(`Built ${events.length} events`);
  return events;
}


async function refreshIfNeeded(): Promise<void> {
  const now = Date.now();
  const age = now - lastRefreshed;
  
  // If data is fresh enough, skip refresh
  if (age < REFRESH_INTERVAL && cachedEvents.length > 0) {
    console.log(`Data is fresh (${Math.round(age / 1000 / 60)} minutes old), using cache`);
    return;
  }
  
  // Prevent concurrent refreshes
  if (isRefreshing) {
    console.log('Refresh already in progress, waiting...');
    // Wait for the ongoing refresh to complete
    while (isRefreshing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }
  
  try {
    isRefreshing = true;
    console.log('Refreshing threat data...');
    
    const newEvents = await buildEvents();
    
    if (newEvents.length > 0) {
      cachedEvents = newEvents;
      lastRefreshed = now;
      console.log(`Refresh complete: ${newEvents.length} events cached`);
    } else {
      console.warn('Refresh produced no events, keeping old cache');
    }
  } catch (error) {
    console.error('Error refreshing data:', error);
    // Keep using stale cache on error
  } finally {
    isRefreshing = false;
  }
}

export async function ensureFreshData(): Promise<AttackEvent[]> {
  await refreshIfNeeded();
  return cachedEvents;
}

export function getEvents(): AttackEvent[] {
  return cachedEvents;
}

export function getSummary(): {
  total: number;
  topCountries: { country: string; count: number }[];
  averageRisk: number;
  lastUpdate: number;
} {
  const events = cachedEvents;
  
  // Count by country
  const countryMap = new Map<string, number>();
  let totalRisk = 0;
  
  events.forEach((event) => {
    countryMap.set(event.country, (countryMap.get(event.country) || 0) + 1);
    totalRisk += event.score;
  });
  
  const topCountries = Array.from(countryMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  const averageRisk = events.length > 0 ? Math.round(totalRisk / events.length) : 0;
  
  return {
    total: events.length,
    topCountries,
    averageRisk,
    lastUpdate: lastRefreshed,
  };
}
