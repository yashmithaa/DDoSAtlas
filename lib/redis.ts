/**
 * Key Schema:
 * - ddos:meta:lastRefreshed     → String (timestamp)
 * - ddos:lock:refresh           → String (lock token), TTL: 60s
 * - ddos:geo:<ip>               → JSON string {lat,lon,country,city}, TTL: 30 days
 * - ddos:events:sorted          → Sorted Set (ip → score), no TTL
 * - ddos:event:<ip>             → JSON string (full event metadata), TTL: 24h
 * - ddos:summary                → JSON string (cached summary), TTL: 5 min
 */

import { Redis } from '@upstash/redis';


export const REDIS_CONFIG = {
  // TTLs in seconds
  GEO_TTL: parseInt(process.env.REDIS_GEO_TTL || '604800', 10),     
  EVENTS_TTL: parseInt(process.env.REDIS_EVENTS_TTL || '86400', 10),  
  LOCK_TTL: parseInt(process.env.REDIS_LOCK_TTL || '60', 10),       
  SUMMARY_TTL: 300,                                                    
  
  // Refresh interval in ms - 2 hours for free tier (reduced from 30 min)
  REFRESH_INTERVAL: parseInt(process.env.REFRESH_INTERVAL_MS || '7200000', 10),
  
  // Max events to store - reduced for free tier
  MAX_EVENTS: parseInt(process.env.MAX_EVENTS || '300', 10),
} as const;

export const REDIS_KEYS = {
  META_LAST_REFRESHED: 'ddos:meta:lastRefreshed',
  LOCK_REFRESH: 'ddos:lock:refresh',
  EVENTS_SORTED: 'ddos:events:sorted',
  SUMMARY: 'ddos:summary',
  
  // Dynamic keys (functions)
  geoKey: (ip: string) => `ddos:geo:${ip}`,
  eventKey: (ip: string) => `ddos:event:${ip}`,
} as const;

// Redis Client Singleton
let redisClient: Redis | null = null;
let redisAvailable = true;
let lastRedisCheck = 0;
const REDIS_CHECK_INTERVAL = 60000; // Re-check availability every 60s

/**
 * Get the Redis client instance.
 * Returns null if Redis is not configured or unavailable.
 */
export function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    console.warn('[Redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured');
    return null;
  }
  
  if (!redisClient) {
    redisClient = new Redis({
      url,
      token,
      // Retry configuration for transient failures
      retry: {
        retries: 2,
        backoff: (retryCount) => Math.min(100 * Math.pow(2, retryCount), 1000),
      },
    });
  }
  
  return redisClient;
}

/**
 * Check if Redis is available.
 * Caches the result to avoid repeated health checks.
 */
export async function isRedisAvailable(): Promise<boolean> {
  const now = Date.now();
  
  // Use cached result if checked recently
  if (now - lastRedisCheck < REDIS_CHECK_INTERVAL) {
    return redisAvailable;
  }
  
  const redis = getRedis();
  if (!redis) {
    redisAvailable = false;
    lastRedisCheck = now;
    return false;
  }
  
  try {
    await redis.ping();
    redisAvailable = true;
  } catch (error) {
    console.error('[Redis] Health check failed:', error);
    redisAvailable = false;
  }
  
  lastRedisCheck = now;
  return redisAvailable;
}

// Safe Redis Operations (with fallback)
/**
 * Wrapper for safe Redis operations with fallback.
 * Returns defaultValue if Redis is unavailable or operation fails.
 */
export async function safeRedisOp<T>(
  operation: (redis: Redis) => Promise<T>,
  defaultValue: T,
  operationName?: string
): Promise<T> {
  const redis = getRedis();
  
  if (!redis) {
    if (operationName) {
      console.warn(`[Redis] ${operationName}: Redis not available, using default`);
    }
    return defaultValue;
  }
  
  try {
    return await operation(redis);
  } catch (error) {
    console.error(`[Redis] ${operationName || 'Operation'} failed:`, error);
    redisAvailable = false;
    return defaultValue;
  }
}

/**
 * Attempt to acquire a refresh lock.
 * Returns true if lock acquired, false if already locked.
 * Uses SET NX (only set if not exists) with TTL.
 */
export async function acquireRefreshLock(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true; // If no Redis, allow refresh (fallback mode)
  
  try {
    const lockToken = `lock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    // SET key value NX EX ttl - only sets if key doesn't exist
    const result = await redis.set(
      REDIS_KEYS.LOCK_REFRESH,
      lockToken,
      { nx: true, ex: REDIS_CONFIG.LOCK_TTL }
    );
    
    return result === 'OK';
  } catch (error) {
    console.error('[Redis] Failed to acquire lock:', error);
    return true; // Allow refresh on error (better than deadlock)
  }
}

/**
 * Release the refresh lock.
 * Should be called after refresh completes.
 */
export async function releaseRefreshLock(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  
  try {
    await redis.del(REDIS_KEYS.LOCK_REFRESH);
  } catch (error) {
    console.error('[Redis] Failed to release lock:', error);
    // Lock will auto-expire via TTL
  }
}

// Metadata Operations

/**
 * Get the last refresh timestamp.
 */
export async function getLastRefreshed(): Promise<number> {
  return safeRedisOp(
    async (redis) => {
      const value = await redis.get<string>(REDIS_KEYS.META_LAST_REFRESHED);
      return value ? parseInt(value, 10) : 0;
    },
    0,
    'getLastRefreshed'
  );
}

/**
 * Set the last refresh timestamp.
 */
export async function setLastRefreshed(timestamp: number): Promise<void> {
  await safeRedisOp(
    async (redis) => {
      await redis.set(REDIS_KEYS.META_LAST_REFRESHED, timestamp.toString());
    },
    undefined,
    'setLastRefreshed'
  );
}

// Geo Cache Operations
export interface GeoData {
  latitude: number;
  longitude: number;
  country: string;
  city?: string;
}

/**
 * Get geo data for a single IP from Redis cache.
 */
export async function getGeoFromCache(ip: string): Promise<GeoData | null> {
  return safeRedisOp(
    async (redis) => {
      const data = await redis.get<GeoData>(REDIS_KEYS.geoKey(ip));
      return data || null;
    },
    null,
    `getGeo:${ip}`
  );
}

/**
 * Get geo data for multiple IPs from Redis cache (batched MGET).
 * Returns a map of ip → GeoData for found entries.
 */
export async function getGeoBatchFromCache(ips: string[]): Promise<Map<string, GeoData>> {
  const results = new Map<string, GeoData>();
  
  if (ips.length === 0) return results;
  
  const redis = getRedis();
  if (!redis) return results;
  
  try {
    const keys = ips.map(ip => REDIS_KEYS.geoKey(ip));
    
    // MGET for batched retrieval (reduces request count)
    const values = await redis.mget<(GeoData | null)[]>(...keys);
    
    for (let i = 0; i < ips.length; i++) {
      const value = values[i];
      if (value) {
        results.set(ips[i], value);
      }
    }
  } catch (error) {
    console.error('[Redis] Batch geo fetch failed:', error);
  }
  
  return results;
}

/**
 * Store geo data for multiple IPs (batched with pipeline).
 */
export async function setGeoBatch(entries: Map<string, GeoData>): Promise<void> {
  if (entries.size === 0) return;
  
  const redis = getRedis();
  if (!redis) return;
  
  try {
    // Use pipeline for batched writes
    const pipeline = redis.pipeline();
    
    entries.forEach((geo, ip) => {
      pipeline.set(REDIS_KEYS.geoKey(ip), JSON.stringify(geo), { ex: REDIS_CONFIG.GEO_TTL });
    });
    
    await pipeline.exec();
    console.log(`[Redis] Cached ${entries.size} geo entries`);
  } catch (error) {
    console.error('[Redis] Batch geo store failed:', error);
  }
}

// Events Operations
export interface StoredEvent {
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

/**
 * Store events in Redis:
 * - Sorted set for top-N by score
 * - Individual event hashes for full metadata
 */
export async function storeEvents(events: StoredEvent[]): Promise<void> {
  if (events.length === 0) return;
  
  const redis = getRedis();
  if (!redis) return;
  
  try {
    const pipeline = redis.pipeline();
    
    // Clear old sorted set and rebuild
    pipeline.del(REDIS_KEYS.EVENTS_SORTED);
    
    // Add to sorted set (ip → score)
    const sortedSetEntries: { score: number; member: string }[] = events.map(e => ({
      score: e.score,
      member: e.ip,
    }));
    
    // ZADD in batches
    for (const entry of sortedSetEntries) {
      pipeline.zadd(REDIS_KEYS.EVENTS_SORTED, entry);
    }
    
    // Store individual event data
    for (const event of events) {
      pipeline.set(
        REDIS_KEYS.eventKey(event.ip),
        JSON.stringify(event),
        { ex: REDIS_CONFIG.EVENTS_TTL }
      );
    }
    
    await pipeline.exec();
    console.log(`[Redis] Stored ${events.length} events`);
  } catch (error) {
    console.error('[Redis] Failed to store events:', error);
  }
}

/**
 * Get top N events by score.
 * Uses sorted set for ordering + batched fetch for full data.
 */
export async function getTopEvents(limit: number = REDIS_CONFIG.MAX_EVENTS): Promise<StoredEvent[]> {
  return safeRedisOp(
    async (redis) => {
      // Get top IPs by score (descending)
      const topIPs = await redis.zrange<string[]>(
        REDIS_KEYS.EVENTS_SORTED,
        0,
        limit - 1,
        { rev: true }
      );
      
      if (!topIPs || topIPs.length === 0) {
        return [];
      }
      
      // Batch fetch event data
      const keys = topIPs.map(ip => REDIS_KEYS.eventKey(ip));
      const eventData = await redis.mget<(StoredEvent | null)[]>(...keys);
      
      // Filter out nulls and return
      const events: StoredEvent[] = [];
      for (const data of eventData) {
        if (data) {
          events.push(data);
        }
      }
      
      // Sort by score (in case of any ordering issues)
      events.sort((a, b) => b.score - a.score);
      
      return events;
    },
    [],
    'getTopEvents'
  );
}

/**
 * Get event count from sorted set.
 */
export async function getEventCount(): Promise<number> {
  return safeRedisOp(
    async (redis) => {
      const count = await redis.zcard(REDIS_KEYS.EVENTS_SORTED);
      return count || 0;
    },
    0,
    'getEventCount'
  );
}

// Summary Cache 

export interface Summary {
  total: number;
  topCountries: { country: string; count: number }[];
  averageRisk: number;
  lastUpdate: number;
}

/**
 * Get cached summary.
 */
export async function getCachedSummary(): Promise<Summary | null> {
  return safeRedisOp(
    async (redis) => {
      const data = await redis.get<Summary>(REDIS_KEYS.SUMMARY);
      return data || null;
    },
    null,
    'getCachedSummary'
  );
}

/**
 * Store summary with short TTL.
 */
export async function setCachedSummary(summary: Summary): Promise<void> {
  await safeRedisOp(
    async (redis) => {
      await redis.set(REDIS_KEYS.SUMMARY, JSON.stringify(summary), { ex: REDIS_CONFIG.SUMMARY_TTL });
    },
    undefined,
    'setCachedSummary'
  );
}


export async function clearAllData(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  
  try {
    // Get all ddos:* keys
    const keys = await redis.keys('ddos:*');
    
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[Redis] Cleared ${keys.length} keys`);
    }
  } catch (error) {
    console.error('[Redis] Failed to clear data:', error);
  }
}


export async function getRedisStats(): Promise<{
  available: boolean;
  eventCount: number;
  lastRefreshed: number;
  geoKeysSample: number;
}> {
  const redis = getRedis();
  
  if (!redis) {
    return { available: false, eventCount: 0, lastRefreshed: 0, geoKeysSample: 0 };
  }
  
  try {
    const [eventCount, lastRefreshed, geoKeys] = await Promise.all([
      redis.zcard(REDIS_KEYS.EVENTS_SORTED),
      redis.get<string>(REDIS_KEYS.META_LAST_REFRESHED),
      redis.keys('ddos:geo:*'),
    ]);
    
    return {
      available: true,
      eventCount: eventCount || 0,
      lastRefreshed: lastRefreshed ? parseInt(lastRefreshed, 10) : 0,
      geoKeysSample: geoKeys?.length || 0,
    };
  } catch (error) {
    console.error('[Redis] Failed to get stats:', error);
    return { available: false, eventCount: 0, lastRefreshed: 0, geoKeysSample: 0 };
  }
}
