// Shared types across the application

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

export interface CountryStats {
  country: string;
  count: number;
}

export interface Summary {
  total: number;
  topCountries: CountryStats[];
  lastUpdate: number | null;
}

export interface DataSource {
  id: string;
  name: string;
  description: string;
  url: string;
  status: "active" | "inactive";
  type: "threat-intel" | "honeypot" | "blocklist";
}
