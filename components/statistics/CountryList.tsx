import type { CountryStats } from "@/types";
import { Card, CardHeader, ProgressBar } from "@/components/ui";

interface CountryListProps {
  countries: CountryStats[];
  total: number;
  limit?: number;
  showRank?: boolean;
  compact?: boolean;
}

export function CountryList({
  countries,
  total,
  limit,
  showRank = true,
  compact = false,
}: CountryListProps) {
  const displayCountries = limit ? countries.slice(0, limit) : countries;

  if (compact) {
    return (
      <div className="space-y-3">
        {displayCountries.map((country) => (
          <div key={country.country}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-300">{country.country}</span>
              <span className="text-xs font-mono text-gray-500">
                {country.count}
              </span>
            </div>
            <ProgressBar value={country.count} max={total} size="sm" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayCountries.map((country, index) => (
        <div key={country.country}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {showRank && (
                <span className="text-gray-500 font-mono text-sm w-8">
                  #{index + 1}
                </span>
              )}
              <span className="font-medium">{country.country}</span>
            </div>
            <span className="text-gray-400 font-mono text-sm">
              {country.count.toLocaleString()}
            </span>
          </div>
          <ProgressBar value={country.count} max={total} variant="gradient" />
        </div>
      ))}
    </div>
  );
}

interface CountryListCardProps {
  countries: CountryStats[];
  total: number;
  title?: string;
  limit?: number;
  compact?: boolean;
}

export function CountryListCard({
  countries,
  total,
  title = "Top Targets",
  limit,
  compact = false,
}: CountryListCardProps) {
  return (
    <Card className={compact ? "p-4" : "p-6"}>
      <CardHeader className={compact ? "mb-3" : "mb-6"}>{title}</CardHeader>
      <CountryList
        countries={countries}
        total={total}
        limit={limit}
        compact={compact}
        showRank={!compact}
      />
    </Card>
  );
}
