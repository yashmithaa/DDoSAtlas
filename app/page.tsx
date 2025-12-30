"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const GlobeComponent = dynamic(() => import("@/components/Globe"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-gray-400">Loading Globe...</div>
    </div>
  ),
});

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

type TabType = "map" | "statistics" | "data-sources";

export default function Home() {
  const [events, setEvents] = useState<AttackEvent[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("map");

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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-xl text-green-400">Loading DDoSAtlas...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">
              <span className="text-green-400">DDOS</span>ATLAS
              <span className="ml-3 text-sm font-normal text-gray-500">LIVE MAP</span>
            </h1>
          </div>
          <div className="text-sm text-gray-400">
            Last updated: {summary?.lastUpdate 
              ? new Date(summary.lastUpdate).toLocaleTimeString()
              : "N/A"}
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <nav className="px-6 flex gap-8 text-sm">
          <button
            onClick={() => setActiveTab("map")}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === "map"
                ? "border-green-400 text-green-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            MAP
          </button>
          <button
            onClick={() => setActiveTab("statistics")}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === "statistics"
                ? "border-green-400 text-green-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            STATISTICS
          </button>
          <button
            onClick={() => setActiveTab("data-sources")}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === "data-sources"
                ? "border-green-400 text-green-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            DATA SOURCES
          </button>
        </nav>
      </header>

      {/* Content */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden">
          {activeTab === "map" && (
            <div className="w-full h-full absolute inset-0 globe-container">
              <GlobeComponent events={events} />
            </div>
          )}

          {activeTab === "statistics" && (
            <div className="p-6 overflow-auto h-full">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                    <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">
                      Total Detections
                    </div>
                    <div className="text-4xl font-bold text-green-400">
                      {summary?.total.toLocaleString() || 0}
                    </div>
                  </div>
                  
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                    <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">
                      Active Events
                    </div>
                    <div className="text-4xl font-bold text-blue-400">
                      {events.length}
                    </div>
                  </div>
                  
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                    <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">
                      Countries Affected
                    </div>
                    <div className="text-4xl font-bold text-orange-400">
                      {summary?.topCountries.length || 0}
                    </div>
                  </div>
                </div>

                {/* Top Countries */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-6 text-green-400">
                    Most Attacked Countries
                  </h2>
                  <div className="space-y-4">
                    {summary?.topCountries.map((country, index) => (
                      <div key={country.country}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500 font-mono text-sm w-8">
                              #{index + 1}
                            </span>
                            <span className="font-medium">{country.country}</span>
                          </div>
                          <span className="text-gray-400 font-mono text-sm">
                            {country.count.toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-red-600 to-orange-500 h-full transition-all duration-500"
                            style={{
                              width: `${(country.count / (summary?.total || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Attacks */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-6 text-green-400">
                    Recent Attack Events
                  </h2>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {events.slice(-10).reverse().map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between py-2 px-3 bg-gray-800/30 rounded hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              event.score > 70
                                ? "bg-red-500"
                                : event.score > 40
                                ? "bg-orange-500"
                                : "bg-blue-500"
                            }`}
                          />
                          <span className="font-mono text-sm text-gray-300">
                            {event.ip}
                          </span>
                          <span className="text-sm text-gray-400">
                            {event.country}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500">
                            Score: {event.score}
                          </span>
                          <span className="text-xs text-gray-600">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "data-sources" && (
            <div className="p-6 flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-2xl font-bold mb-2 text-gray-300">
                  Data Sources
                </h2>
                <p className="text-gray-500">
                  Coming soon. Real threat intelligence feeds will be integrated here.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Side Stats Panel (visible on map view) */}
        {activeTab === "map" && (
          <div className="w-80 border-l border-gray-800 bg-black/90 backdrop-blur-sm p-4 overflow-y-auto flex-shrink-0 relative z-10">
            <div className="space-y-4">
              {/* Live Stats */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-400 mb-3 uppercase tracking-wider">
                  Live Statistics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Total Attacks</span>
                    <span className="text-lg font-bold text-white">
                      {summary?.total.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Active Events</span>
                    <span className="text-lg font-bold text-blue-400">
                      {events.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Countries Compact */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-400 mb-3 uppercase tracking-wider">
                  Top Targets
                </h3>
                <div className="space-y-3">
                  {summary?.topCountries.slice(0, 5).map((country, index) => (
                    <div key={country.country}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-300">
                          {country.country}
                        </span>
                        <span className="text-xs font-mono text-gray-500">
                          {country.count}
                        </span>
                      </div>
                      <div className="bg-gray-800 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-red-600 h-full"
                          style={{
                            width: `${(country.count / (summary?.total || 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-400 mb-3 uppercase tracking-wider">
                  Recent Activity
                </h3>
                <div className="space-y-2">
                  {events.slice(-5).reverse().map((event) => (
                    <div
                      key={event.id}
                      className="text-xs py-2 px-2 bg-gray-800/30 rounded"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            event.score > 70
                              ? "bg-red-500"
                              : event.score > 40
                              ? "bg-orange-500"
                              : "bg-blue-500"
                          }`}
                        />
                        <span className="font-mono text-gray-300">
                          {event.ip}
                        </span>
                      </div>
                      <div className="text-gray-500 ml-3.5">
                        {event.country} • Score: {event.score}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
