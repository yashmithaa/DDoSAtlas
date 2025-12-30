import { ReactNode } from "react";

interface SidebarProps {
  children: ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <div className="w-80 border-l border-gray-800 bg-black/90 backdrop-blur-sm p-4 overflow-y-auto flex-shrink-0 relative z-10">
      <div className="space-y-4">{children}</div>
    </div>
  );
}
