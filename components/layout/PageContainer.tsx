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
  const baseClasses = "min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-100px)] lg:min-h-[calc(100vh-120px)]";
  const centeredClasses = centered
    ? "flex items-center justify-center"
    : "overflow-auto p-3 sm:p-4 md:p-6";

  return (
    <div className={`${baseClasses} ${centeredClasses} ${className}`}>
      {children}
    </div>
  );
}
