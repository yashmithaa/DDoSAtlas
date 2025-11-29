"use client";
import { useEffect, useState } from "react";

interface AttackEvent {
  id: string;
  ip: string;
  latitude: number;
  longitude: number;
  country: string;
  score: number;
  source: string;
  timestamp: number;
}

interface Summary {
  total: number;
  topCountries: { country: string; count: number }[];
  lastUpdate: number | null;
}

export default function Home() {
  const [events, setEvents] = useState<AttackEvent[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, summaryRes] = await Promise.all([
          fetch("/api/events"),
          fetch("/api/summary"),
        ]);
        
        const eventsData = await eventsRes.json();
        const summaryData = await summaryRes.json();
        
        setEvents(eventsData);
        setSummary(summaryData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">DDoSAtlas</h1>
        <p className="text-gray-400 mb-8">Global Malicious IP Activity Monitor</p>
        
        {/* Stats Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-2">Total Attacks</div>
            <div className="text-3xl font-bold">{summary?.total || 0}</div>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-2">Last Update</div>
            <div className="text-xl">
              {summary?.lastUpdate 
                ? new Date(summary.lastUpdate).toLocaleTimeString()
                : "N/A"}
            </div>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-2">Active Events</div>
            <div className="text-3xl font-bold">{events.length}</div>
          </div>
        </div>

        {/* Top Countries */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Top Countries</h2>
          <div className="space-y-3">
            {summary?.topCountries.map((country, index) => (
              <div key={country.country} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 font-mono text-sm w-6">#{index + 1}</span>
                  <span>{country.country}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-gray-800 h-2 w-32 rounded-full overflow-hidden">
                    <div
                      className="bg-red-600 h-full"
                      style={{
                        width: `${(country.count / (summary?.total || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-gray-400 font-mono text-sm w-12 text-right">
                    {country.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* World Map Visualization */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Attack Map</h2>
          <div className="relative w-full aspect-[2/1] bg-gray-950 rounded-lg overflow-hidden">
            {/* Simple flat map representation */}
            <svg
              viewBox="-180 -90 360 180"
              className="w-full h-full"
              style={{ transform: "scaleY(-1)" }}
            >
              {/* World outline (simplified) */}
              <rect
                x="-180"
                y="-90"
                width="360"
                height="180"
                fill="#0a0a0a"
                stroke="#333"
                strokeWidth="0.5"
              />
              
              {/* Grid lines */}
              {Array.from({ length: 7 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="-180"
                  y1={-90 + i * 30}
                  x2="180"
                  y2={-90 + i * 30}
                  stroke="#1a1a1a"
                  strokeWidth="0.3"
                />
              ))}
              {Array.from({ length: 13 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={-180 + i * 30}
                  y1="-90"
                  x2={-180 + i * 30}
                  y2="90"
                  stroke="#1a1a1a"
                  strokeWidth="0.3"
                />
              ))}

              {/* Attack events as dots */}
              {events.map((event) => {
                const opacity = Math.max(0.3, event.score / 100);
                const size = 1 + (event.score / 100) * 2;
                
                return (
                  <circle
                    key={event.id}
                    cx={event.longitude}
                    cy={event.latitude}
                    r={size}
                    fill={`rgba(239, 68, 68, ${opacity})`}
                    className="animate-pulse"
                  >
                    <title>
                      {event.country} - {event.ip} (Score: {event.score})
                    </title>
                  </circle>
                );
              })}
            </svg>
          </div>
          
          <div className="mt-4 text-sm text-gray-500 text-center">
            {events.length} events displayed • Hover over dots for details
          </div>
        </div>
      </div>
    </main>
  );
}
