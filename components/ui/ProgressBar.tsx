interface ProgressBarProps {
  value: number;
  max: number;
  variant?: "default" | "gradient";
  size?: "sm" | "md";
}

export function ProgressBar({
  value,
  max,
  variant = "default",
  size = "md",
}: ProgressBarProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const heightClass = size === "sm" ? "h-1" : "h-2";

  const barClass =
    variant === "gradient"
      ? "bg-gradient-to-r from-red-600 to-orange-500"
      : "bg-red-600";

  return (
    <div className={`bg-gray-800 ${heightClass} rounded-full overflow-hidden`}>
      <div
        className={`${barClass} h-full transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
