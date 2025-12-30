import { PageContainer } from "@/components/layout";
import { Card, CardHeader } from "@/components/ui";
import type { DataSource } from "@/types";

const DATA_SOURCES: DataSource[] = [
  {
    id: "abuseipdb",
    name: "AbuseIPDB",
    description:
      "Community-driven database of reported malicious IP addresses with abuse confidence scores.",
    url: "https://www.abuseipdb.com/",
    status: "active",
    type: "threat-intel",
  },
  {
    id: "feodotracker",
    name: "Feodo Tracker",
    description:
      "Botnet C2 tracker by abuse.ch, tracking Emotet, Dridex, and other banking trojans.",
    url: "https://feodotracker.abuse.ch/",
    status: "active",
    type: "blocklist",
  },
  {
    id: "sslbl",
    name: "SSL Blacklist",
    description:
      "Database of malicious SSL certificates used by botnet C&C servers.",
    url: "https://sslbl.abuse.ch/",
    status: "active",
    type: "blocklist",
  },
  {
    id: "urlhaus",
    name: "URLhaus",
    description: "Database of malicious URLs used for malware distribution.",
    url: "https://urlhaus.abuse.ch/",
    status: "coming-soon",
    type: "threat-intel",
  },
  {
    id: "threatfox",
    name: "ThreatFox",
    description:
      "Platform for sharing indicators of compromise (IOCs) with the security community.",
    url: "https://threatfox.abuse.ch/",
    status: "coming-soon",
    type: "threat-intel",
  },
  {
    id: "honeypot",
    name: "Honeypot Network",
    description:
      "Custom honeypot infrastructure for capturing real-time attack data.",
    url: "#",
    status: "coming-soon",
    type: "honeypot",
  },
];

const statusColors = {
  active: "bg-green-500",
  inactive: "bg-gray-500",
  "coming-soon": "bg-yellow-500",
};

const statusLabels = {
  active: "Active",
  inactive: "Inactive",
  "coming-soon": "Coming Soon",
};

const typeColors = {
  "threat-intel": "text-blue-400 bg-blue-400/10",
  honeypot: "text-purple-400 bg-purple-400/10",
  blocklist: "text-orange-400 bg-orange-400/10",
};

export default function DataSourcesPage() {
  const activeSources = DATA_SOURCES.filter((s) => s.status === "active");
  const comingSources = DATA_SOURCES.filter((s) => s.status === "coming-soon");

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Data Sources</h1>
          <p className="text-gray-400">
            DDoSAtlas aggregates threat intelligence from multiple sources to
            provide comprehensive attack visibility.
          </p>
        </div>

        {/* Active Sources */}
        <div>
          <h2 className="text-lg font-semibold text-green-400 mb-4">
            Active Sources ({activeSources.length})
          </h2>
          <div className="grid gap-4">
            {activeSources.map((source) => (
              <DataSourceCard key={source.id} source={source} />
            ))}
          </div>
        </div>

        {/* Coming Soon */}
        <div>
          <h2 className="text-lg font-semibold text-yellow-400 mb-4">
            Coming Soon ({comingSources.length})
          </h2>
          <div className="grid gap-4">
            {comingSources.map((source) => (
              <DataSourceCard key={source.id} source={source} />
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function DataSourceCard({ source }: { source: DataSource }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-white">{source.name}</h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${typeColors[source.type]}`}
            >
              {source.type.replace("-", " ")}
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-3">{source.description}</p>
          {source.url !== "#" && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-400 hover:text-green-300 transition-colors"
            >
              Visit source →
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${statusColors[source.status]}`}
          />
          <span className="text-xs text-gray-500">
            {statusLabels[source.status]}
          </span>
        </div>
      </div>
    </Card>
  );
}
