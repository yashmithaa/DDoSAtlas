import { SCORE_THRESHOLDS } from "@/constants";

interface StatusIndicatorProps {
  score: number;
  size?: "sm" | "md";
}

export function StatusIndicator({ score, size = "md" }: StatusIndicatorProps) {
  const sizeClass = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  const colorClass =
    score > SCORE_THRESHOLDS.HIGH
      ? "bg-red-500"
      : score > SCORE_THRESHOLDS.MEDIUM
      ? "bg-orange-500"
      : "bg-blue-500";

  return <div className={`${sizeClass} rounded-full ${colorClass}`} />;
}
