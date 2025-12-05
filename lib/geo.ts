export interface GeoLocation {
  latitude: number;
  longitude: number;
  country: string;
  city?: string;
}

// In-memory cache for geolocation data
const geoCache = new Map<string, GeoLocation>();

export async function geolocate(ip: string): Promise<GeoLocation | null> {
  if (geoCache.has(ip)) return geoCache.get(ip)!;

  // Fallback: perform a batch fetch for this single IP to reuse batch logic
  const map = await geolocateBatch([ip]);
  return map.get(ip) || null;
}

export async function geolocateBatch(ips: string[]): Promise<Map<string, GeoLocation>> {
  const results = new Map<string, GeoLocation>();

  // Identify uncached IPs
  const uncached = ips.filter(ip => !geoCache.has(ip));
  console.log(`Geolocating ${uncached.length} new IPs (${ips.length - uncached.length} cached)`);

  // Add cached entries to results
  for (const ip of ips) {
    if (geoCache.has(ip)) results.set(ip, geoCache.get(ip)!);
  }

  if (uncached.length === 0) return results;

  const BATCH_SIZE = 100; // ip-api supports up to 100 per batch
  for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
    const chunk = uncached.slice(i, i + BATCH_SIZE);

    try {
      const body = chunk.map(ip => ({ query: ip }));
      // Read batch endpoint from environment to avoid hardcoding third-party URLs
      const IP_API_BATCH_URL = process.env.IP_API_BATCH_URL;
      if (!IP_API_BATCH_URL) {
        console.warn('IP_API_BATCH_URL not set — skipping geolocation for uncached IPs');
        break;
      }

      const resp = await fetch(IP_API_BATCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        next: { revalidate: 86400 },
      });

      if (!resp.ok) {
        console.error('ip-api batch request failed:', resp.status);
        continue;
      }

      const data = await resp.json();
      if (!Array.isArray(data)) {
        console.error('Unexpected batch response from ip-api:', data);
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
          geoCache.set(ip, geo);
          results.set(ip, geo);
        }
      }
    } catch (err) {
      console.error('Error during ip-api batch geolocation:', err);
    }

    if (i + BATCH_SIZE < uncached.length) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  return results;
}

// cache
export function getGeoCacheStats() {
  return {
    size: geoCache.size,
    entries: geoCache.size,
  };
}
