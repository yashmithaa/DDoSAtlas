"use client";

import { useEventsContext } from "@/providers";
import { Header } from "@/components/layout";
import { LoadingScreen } from "@/components/ui";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { summary, loading } = useEventsContext();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <Header lastUpdate={summary?.lastUpdate ?? null} />
      {children}
    </main>
  );
}
