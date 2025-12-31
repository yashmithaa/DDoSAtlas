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
    <Card className="p-4 sm:p-6">
      <div className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wider mb-1 sm:mb-2">
        {label}
      </div>
      <div className={`text-2xl sm:text-3xl md:text-4xl font-bold ${colorClasses[color]}`}>{value}</div>
    </Card>
  );
}
