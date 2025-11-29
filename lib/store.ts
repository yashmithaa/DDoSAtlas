// In-memory store for attack events
export interface AttackEvent {
  id: string;
  ip: string;
  latitude: number;
  longitude: number;
  country: string;
  score: number;
  source: string;
  timestamp: number;
}

const MAX_EVENTS = 500;
let events: AttackEvent[] = [];

// Country data for fake event generation
const COUNTRIES = [
  { name: "United States", lat: 37.0902, lon: -95.7129 },
  { name: "China", lat: 35.8617, lon: 104.1954 },
  { name: "Russia", lat: 61.5240, lon: 105.3188 },
  { name: "Brazil", lat: -14.2350, lon: -51.9253 },
  { name: "India", lat: 20.5937, lon: 78.9629 },
  { name: "United Kingdom", lat: 55.3781, lon: -3.4360 },
  { name: "Germany", lat: 51.1657, lon: 10.4515 },
  { name: "France", lat: 46.2276, lon: 2.2137 },
  { name: "Japan", lat: 36.2048, lon: 138.2529 },
  { name: "South Korea", lat: 35.9078, lon: 127.7669 },
  { name: "Canada", lat: 56.1304, lon: -106.3468 },
  { name: "Australia", lat: -25.2744, lon: 133.7751 },
  { name: "Netherlands", lat: 52.1326, lon: 5.2913 },
  { name: "Poland", lat: 51.9194, lon: 19.1451 },
  { name: "Turkey", lat: 38.9637, lon: 35.2433 },
];

function randomIP(): string {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

function generateFakeEvents(count: number = 3): AttackEvent[] {
  const newEvents: AttackEvent[] = [];
  
  for (let i = 0; i < count; i++) {
    const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    // Add some randomness to coordinates
    const latVariance = (Math.random() - 0.5) * 10;
    const lonVariance = (Math.random() - 0.5) * 10;
    
    newEvents.push({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ip: randomIP(),
      latitude: country.lat + latVariance,
      longitude: country.lon + lonVariance,
      country: country.name,
      score: Math.floor(Math.random() * 100),
      source: "mock",
      timestamp: Date.now(),
    });
  }
  
  return newEvents;
}

export function addFakeEvents(): void {
  const newEvents = generateFakeEvents();
  events.push(...newEvents);
  
  // Keep only the last MAX_EVENTS
  if (events.length > MAX_EVENTS) {
    events = events.slice(-MAX_EVENTS);
  }
}

export function getEvents(): AttackEvent[] {
  return events;
}

export function getSummary(): {
  total: number;
  topCountries: { country: string; count: number }[];
  lastUpdate: number | null;
} {
  const countryMap = new Map<string, number>();
  
  events.forEach((event) => {
    countryMap.set(event.country, (countryMap.get(event.country) || 0) + 1);
  });
  
  const topCountries = Array.from(countryMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  const lastUpdate = events.length > 0 ? Math.max(...events.map(e => e.timestamp)) : null;
  
  return {
    total: events.length,
    topCountries,
    lastUpdate,
  };
}
