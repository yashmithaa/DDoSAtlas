import {
  getGeoBatchFromCache,
  setGeoBatch,
  GeoData,
} from './redis';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  country: string;
  city?: string;
}

// In-memory fallback cache (used when Redis is unavailable)
const localGeoCache = new Map<string, GeoLocation>();

export async function geolocate(ip: string): Promise<GeoLocation | null> {
  // Check local cache first (fallback)
  if (localGeoCache.has(ip)) return localGeoCache.get(ip)!;

  // Fallback: perform a batch fetch for this single IP to reuse batch logic
  const map = await geolocateBatch([ip]);
  return map.get(ip) || null;
}

export async function geolocateBatch(ips: string[]): Promise<Map<string, GeoLocation>> {
  const results = new Map<string, GeoLocation>();
  
  if (ips.length === 0) return results;

  // Step 1: Check Redis cache first (batched)
  let redisHits = new Map<string, GeoLocation>();
  try {
    const redisCached = await getGeoBatchFromCache(ips);
    redisCached.forEach((geo, ip) => {
      const geoLoc: GeoLocation = {
        latitude: geo.latitude,
        longitude: geo.longitude,
        country: geo.country,
        city: geo.city,
      };
      results.set(ip, geoLoc);
      localGeoCache.set(ip, geoLoc); // Warm local cache
      redisHits.set(ip, geoLoc);
    });
  } catch (error) {
    console.warn('[Geo] Redis cache read failed, using local cache:', error);
  }

  // Step 2: Check local fallback cache for remaining IPs
  const afterRedis = ips.filter(ip => !results.has(ip));
  for (const ip of afterRedis) {
    if (localGeoCache.has(ip)) {
      results.set(ip, localGeoCache.get(ip)!);
    }
  }

  // Step 3: Identify uncached IPs
  const uncached = ips.filter(ip => !results.has(ip));
  console.log(`[Geo] ${redisHits.size} Redis hits, ${ips.length - uncached.length - redisHits.size} local hits, ${uncached.length} to fetch`);

  if (uncached.length === 0) return results;

  // Step 4: Fetch from ip-api in batches
  const newGeoEntries = new Map<string, GeoData>();
  const BATCH_SIZE = 100; // ip-api supports up to 100 per batch
  
  for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
    const chunk = uncached.slice(i, i + BATCH_SIZE);

    try {
      const body = chunk.map(ip => ({ query: ip }));
      const IP_API_BATCH_URL = process.env.IP_API_BATCH_URL;
      if (!IP_API_BATCH_URL) {
        console.warn('[Geo] IP_API_BATCH_URL not set — skipping geolocation for uncached IPs');
        break;
      }

      const resp = await fetch(IP_API_BATCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        next: { revalidate: 86400 },
      });

      if (!resp.ok) {
        console.error('[Geo] ip-api batch request failed:', resp.status);
        continue;
      }

      const data = await resp.json();
      if (!Array.isArray(data)) {
        console.error('[Geo] Unexpected batch response from ip-api:', data);
        continue;
      }

      for (let idx = 0; idx < data.length; idx++) {
        const entry = data[idx];
        const ip = chunk[idx];
        if (entry && entry.status === 'success') {
          const geo: GeoLocation = {
            latitude: entry.lat,
            longitude: entry.lon,
            country: entry.country || 'Unknown',
            city: entry.city,
          };
          results.set(ip, geo);
          localGeoCache.set(ip, geo);
          
          // Prepare for Redis cache
          newGeoEntries.set(ip, {
            latitude: geo.latitude,
            longitude: geo.longitude,
            country: geo.country,
            city: geo.city,
          });
        }
      }
    } catch (err) {
      console.error('[Geo] Error during ip-api batch geolocation:', err);
    }

    // Rate limiting between batches
    if (i + BATCH_SIZE < uncached.length) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  // Step 5: Store new geo entries in Redis (batched)
  if (newGeoEntries.size > 0) {
    try {
      await setGeoBatch(newGeoEntries);
    } catch (error) {
      console.warn('[Geo] Failed to cache geo entries in Redis:', error);
    }
  }

  return results;
}

// Get cache stats (includes both Redis and local)
export function getGeoCacheStats() {
  return {
    localCacheSize: localGeoCache.size,
    entries: localGeoCache.size,
  };
}
