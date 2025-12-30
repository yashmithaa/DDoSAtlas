import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  centered?: boolean;
}

export function PageContainer({
  children,
  className = "",
  centered = false,
}: PageContainerProps) {
  const baseClasses = "h-[calc(100vh-120px)]";
  const centeredClasses = centered
    ? "flex items-center justify-center"
    : "overflow-auto p-6";

  return (
    <div className={`${baseClasses} ${centeredClasses} ${className}`}>
      {children}
    </div>
  );
}
