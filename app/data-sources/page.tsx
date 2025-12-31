"use client";

import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout";
import { Card } from "@/components/ui";
import type { DataSource } from "@/types";

const statusColors = {
  active: "bg-green-500",
  inactive: "bg-gray-500",
};

const statusLabels = {
  active: "Active",
  inactive: "Not Configured",
};

const typeColors = {
  "threat-intel": "text-blue-400 bg-blue-400/10",
  honeypot: "text-purple-400 bg-purple-400/10",
  blocklist: "text-orange-400 bg-orange-400/10",
};

export default function DataSourcesPage() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDataSources() {
      try {
        const response = await fetch("/api/data-sources");
        if (!response.ok) {
          throw new Error("Failed to fetch data sources");
        }
        const data = await response.json();
        setDataSources(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchDataSources();
  }, []);

  const activeSources = dataSources.filter((s) => s.status === "active");
  const inactiveSources = dataSources.filter((s) => s.status === "inactive");

  if (loading) {
    return (
      <PageContainer>
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
            <div className="space-y-4 mt-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-800 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
            <h2 className="text-red-400 font-semibold">Error Loading Data Sources</h2>
            <p className="text-red-300 mt-2">{error}</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Data Sources</h1>
          
        </div>

        {/* Active Sources */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-green-400 mb-3 sm:mb-4">
            Active Sources ({activeSources.length})
          </h2>
          {activeSources.length > 0 ? (
            <div className="grid gap-3 sm:gap-4">
              {activeSources.map((source) => (
                <DataSourceCard key={source.id} source={source} />
              ))}
            </div>
          ) : (
            <Card className="p-4">
              <p className="text-gray-400">
                No active data sources configured. Please set the required environment
                variables to enable threat feeds.
              </p>
            </Card>
          )}
        </div>

        {/* Inactive Sources */}
        {inactiveSources.length > 0 && (
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-400 mb-3 sm:mb-4">
              Available Sources - Not Configured ({inactiveSources.length})
            </h2>
            <div className="grid gap-3 sm:gap-4">
              {inactiveSources.map((source) => (
                <DataSourceCard key={source.id} source={source} />
              ))}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

function DataSourceCard({ source }: { source: DataSource }) {
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-0">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
            <h3 className="text-base sm:text-lg font-semibold text-white">{source.name}</h3>
            <span
              className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full ${typeColors[source.type]}`}
            >
              {source.type.replace("-", " ")}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3">{source.description}</p>
          {source.url !== "#" && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm text-green-400 hover:text-green-300 transition-colors"
            >
              Visit source →
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 sm:ml-4">
          <span
            className={`w-2 h-2 rounded-full ${statusColors[source.status as keyof typeof statusColors]}`}
          />
          <span className="text-[10px] sm:text-xs text-gray-500">
            {statusLabels[source.status as keyof typeof statusLabels]}
          </span>
        </div>
      </div>
    </Card>
  );
}
