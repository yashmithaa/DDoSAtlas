"use client";

import dynamic from "next/dynamic";
import type { AttackEvent } from "@/types";

const Globe = dynamic(() => import("@/components/Globe"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-gray-400">Loading Globe...</div>
    </div>
  ),
});

interface GlobeViewProps {
  events: AttackEvent[];
}

export function GlobeView({ events }: GlobeViewProps) {
  return (
    <div className="w-full h-full absolute inset-0 globe-container">
      <Globe events={events} />
    </div>
  );
}
