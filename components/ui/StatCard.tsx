import { Card } from "./Card";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: "green" | "blue" | "orange" | "red";
}

const colorClasses = {
  green: "text-green-400",
  blue: "text-blue-400",
  orange: "text-orange-400",
  red: "text-red-400",
};

export function StatCard({ label, value, color = "green" }: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className={`text-4xl font-bold ${colorClasses[color]}`}>{value}</div>
    </Card>
  );
}
