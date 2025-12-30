import { fetchThreatFeeds } from './feeds';
import { normalizeEvents, deduplicateEvents } from './normalize';
import { scoreEvents } from './scoring';
import { geolocateBatch } from './geo';
import {
  REDIS_CONFIG,
  acquireRefreshLock,
  releaseRefreshLock,
  getLastRefreshed,
  setLastRefreshed,
  storeEvents,
  getTopEvents,
  getCachedSummary,
  setCachedSummary,
  StoredEvent,
  Summary,
  getRedis,
} from './redis';

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

const MAX_EVENTS = REDIS_CONFIG.MAX_EVENTS;
const REFRESH_INTERVAL = REDIS_CONFIG.REFRESH_INTERVAL;

// In-memory fallback cache (used when Redis is unavailable)
let localCachedEvents: AttackEvent[] = [];
let localLastRefreshed: number = 0;
let isRefreshing = false;


async function buildEvents(): Promise<AttackEvent[]> {
  console.log('[Store] Building events from threat feeds...');
  
  // Fetch threat feeds
  const rawEntries = await fetchThreatFeeds();
  
  if (rawEntries.length === 0) {
    console.warn('[Store] No threat feed data available');
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
  
  console.log(`[Store] Processing top ${topIPs.length} IPs for geolocation...`);
  
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
  
  console.log(`[Store] Built ${events.length} events`);
  return events;
}


/**
 * Check if data needs refresh based on Redis or local timestamp.
 */
async function needsRefresh(): Promise<boolean> {
  const now = Date.now();
  
  // Try to get last refresh time from Redis
  const redisLastRefreshed = await getLastRefreshed();
  
  if (redisLastRefreshed > 0) {
    const age = now - redisLastRefreshed;
    if (age < REFRESH_INTERVAL) {
      console.log(`[Store] Data is fresh (${Math.round(age / 1000 / 60)} min old), using Redis cache`);
      return false;
    }
  }
  
  // Fallback to local timestamp
  if (localLastRefreshed > 0) {
    const localAge = now - localLastRefreshed;
    if (localAge < REFRESH_INTERVAL && localCachedEvents.length > 0) {
      console.log(`[Store] Data is fresh locally (${Math.round(localAge / 1000 / 60)} min old)`);
      return false;
    }
  }
  
  return true;
}

/**
 * Attempt to refresh data with atomic lock.
 */
async function refreshIfNeeded(): Promise<void> {
  // Check if refresh is needed
  if (!(await needsRefresh())) {
    return;
  }
  
  // Prevent local concurrent refreshes
  if (isRefreshing) {
    console.log('[Store] Local refresh in progress, waiting...');
    while (isRefreshing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }
  
  // Try to acquire distributed lock (Redis)
  const lockAcquired = await acquireRefreshLock();
  
  if (!lockAcquired) {
    console.log('[Store] Another instance is refreshing, waiting for fresh data...');
    // Wait a bit and check for fresh data
    await new Promise(resolve => setTimeout(resolve, 5000));
    return;
  }
  
  try {
    isRefreshing = true;
    console.log('[Store] Acquired refresh lock, starting refresh...');
    
    const newEvents = await buildEvents();
    const now = Date.now();
    
    if (newEvents.length > 0) {
      // Store in Redis
      const storedEvents: StoredEvent[] = newEvents.map(e => ({
        id: e.id,
        ip: e.ip,
        latitude: e.latitude,
        longitude: e.longitude,
        country: e.country,
        score: e.score,
        source: e.source,
        reason: e.reason,
        timestamp: e.timestamp,
      }));
      
      await storeEvents(storedEvents);
      await setLastRefreshed(now);
      
      // Update local cache as fallback
      localCachedEvents = newEvents;
      localLastRefreshed = now;
      
      // Invalidate summary cache (will be rebuilt on next request)
      console.log(`[Store] Refresh complete: ${newEvents.length} events stored`);
    } else {
      console.warn('[Store] Refresh produced no events, keeping old cache');
    }
  } catch (error) {
    console.error('[Store] Error refreshing data:', error);
    // Keep using stale cache on error
  } finally {
    isRefreshing = false;
    await releaseRefreshLock();
  }
}

/**
 * Get events - tries Redis first, falls back to local cache or rebuild.
 */
export async function ensureFreshData(): Promise<AttackEvent[]> {
  await refreshIfNeeded();
  
  // Try to get from Redis
  const redis = getRedis();
  if (redis) {
    try {
      const redisEvents = await getTopEvents(MAX_EVENTS);
      if (redisEvents.length > 0) {
        // Update local cache
        localCachedEvents = redisEvents as AttackEvent[];
        return localCachedEvents;
      }
    } catch (error) {
      console.warn('[Store] Failed to get events from Redis:', error);
    }
  }
  
  // Fallback to local cache
  if (localCachedEvents.length > 0) {
    console.log('[Store] Using local cached events');
    return localCachedEvents;
  }
  
  // Last resort: try to rebuild without Redis
  console.warn('[Store] No cached data available, attempting rebuild...');
  try {
    const freshEvents = await buildEvents();
    localCachedEvents = freshEvents;
    localLastRefreshed = Date.now();
    return freshEvents;
  } catch (error) {
    console.error('[Store] Failed to rebuild events:', error);
    return [];
  }
}

export function getEvents(): AttackEvent[] {
  return localCachedEvents;
}

/**
 * Get summary - uses Redis cache when available.
 */
export async function getSummary(): Promise<Summary> {
  // Try Redis cached summary first
  const cachedSummary = await getCachedSummary();
  if (cachedSummary) {
    return cachedSummary;
  }
  
  // Build summary from events
  const events = localCachedEvents.length > 0 
    ? localCachedEvents 
    : await getTopEvents(MAX_EVENTS);
  
  // Get last refresh time
  const lastUpdate = await getLastRefreshed() || localLastRefreshed;
  
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
  
  const summary: Summary = {
    total: events.length,
    topCountries,
    averageRisk,
    lastUpdate,
  };
  
  // Cache the summary
  await setCachedSummary(summary);
  
  return summary;
}
