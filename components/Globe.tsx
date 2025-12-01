"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

interface AttackEvent {
  id: string;
  ip: string;
  latitude: number;
  longitude: number;
  country: string;
  score: number;
  source: string;
  timestamp: number;
}

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

interface GlobeComponentProps {
  events: AttackEvent[];
}

export default function GlobeComponent({ events }: GlobeComponentProps) {
  const globeEl = useRef<any>();
  const [arcsData, setArcsData] = useState<any[]>([]);
  const [pointsData, setPointsData] = useState<any[]>([]);

  useEffect(() => {
    // Auto-rotate globe
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
    }
  }, []);

  useEffect(() => {
    // Convert events to points
    const points = events.map((event) => ({
      lat: event.latitude,
      lng: event.longitude,
      size: 0.1 + (event.score / 100) * 0.3,
      color: event.score > 70 ? "#ef4444" : event.score > 40 ? "#f97316" : "#3b82f6",
      label: `${event.country} - ${event.ip}`,
    }));
    setPointsData(points);

    // Create attack arcs (from random source to destination)
    const arcs = events.slice(0, 20).map((event) => {
      const sourceLat = (Math.random() - 0.5) * 180;
      const sourceLng = (Math.random() - 0.5) * 360;
      
      return {
        startLat: sourceLat,
        startLng: sourceLng,
        endLat: event.latitude,
        endLng: event.longitude,
        color: event.score > 70 ? "rgba(239, 68, 68, 0.6)" : event.score > 40 ? "rgba(249, 115, 22, 0.6)" : "rgba(59, 130, 246, 0.6)",
      };
    });
    setArcsData(arcs);
  }, [events]);

  return (
    <div className="w-full h-full">
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        // Points (attack locations)
        pointsData={pointsData}
        pointAltitude="size"
        pointColor="color"
        pointLabel="label"
        pointRadius={0.5}
        
        // Arcs (attack paths)
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={2000}
        arcStroke={0.5}
        
        atmosphereColor="#1e40af"
        atmosphereAltitude={0.15}
        
        enablePointerInteraction={true}
      />
    </div>
  );
}
