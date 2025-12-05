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
  const [backendEvents, setBackendEvents] = useState<AttackEvent[] | null>(null);

  useEffect(() => {
    // Auto-rotate globe
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
    }
  }, []);

  useEffect(() => {
    if (!events || events.length === 0) {
      setPointsData([]);
      setArcsData([]);
      return;
    }

    // Compute score distribution to build adaptive thresholds
    const scores = events.map((e) => e.score).filter((s) => typeof s === 'number');
    const sorted = [...scores].sort((a, b) => a - b);
    const percentile = (p: number) => {
      if (sorted.length === 0) return 0;
      const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
      return sorted[idx];
    };

    const p50 = percentile(50);
    const p80 = percentile(80);

    const minAlt = 0.005;
    const maxAlt = 0.12;
    const sMin = sorted[0] ?? 0;
    const sMax = sorted[sorted.length - 1] ?? 100;
    const normalize = (score: number) => {
      // handle constant-score datasets by using absolute scale
      const t = sMax === sMin ? Math.max(0, Math.min(1, (score || 0) / 100)) : Math.max(0, Math.min(1, (score - sMin) / (sMax - sMin)));
      // compress extremes with sqrt for better visual spread
      return minAlt + Math.sqrt(t) * (maxAlt - minAlt);
    };

    function scoreToColor(score: number) {
      const s = typeof score === 'number' ? score : 0;
      // fallback normalized t when sMax === sMin
      const tFallback = sMax === sMin ? Math.max(0, Math.min(1, s / 100)) : undefined;
      // Use HSL interpolation: green (120) -> yellow (45) -> red (0)
      if (s >= p80 && sMax !== sMin) {
        // high: interpolate 45 -> 0
        const t = (s - p80) / Math.max(1e-6, (sMax - p80));
        const hue = 45 - t * 45; // 45..0
        return `hsl(${hue}, 85%, 55%)`;
      } else if (s >= p50 && sMax !== sMin) {
        // medium: interpolate 120 -> 45
        const t = (s - p50) / Math.max(1e-6, (p80 - p50));
        const hue = 120 - t * 75; // 120..45
        return `hsl(${hue}, 85%, 45%)`;
      } else {
        // low or fallback when sMax === sMin: use normalized tFallback or relative to p50
        const t = tFallback !== undefined ? tFallback : Math.max(0, Math.min(1, (s - sMin) / Math.max(1e-6, (p50 - sMin))));
        const hue = 140 - t * 40; // 140..100 (greener range)
        return `hsl(${hue}, 80%, 40%)`;
      }
    }

    const points = events.map((event) => ({
      lat: event.latitude,
      lng: event.longitude,
      size: normalize(event.score),
      color: scoreToColor(event.score),
      label: `${event.country} - ${event.ip} • Score: ${event.score}`,
    }));
    setPointsData(points);

    const buildArcs = (sourcePool: AttackEvent[], dests: AttackEvent[]) => {
      if (!dests || dests.length === 0) return [];

      const numSources = Math.max(1, Math.min(10, sourcePool.length));
      const sources = sourcePool.slice(0, numSources);

      const arcs = dests.slice(0, 20).map((dest, idx) => {
        // pick a source deterministically from the pool (rotate through sources)
        let src = sources[idx % sources.length];

        // if source and dest are identical IPs, try next candidate
        if (src && src.ip === dest.ip && sources.length > 1) {
          src = sources[(idx + 1) % sources.length];
        }

        // fallback to a light randomization only when src is missing
        const startLat = src ? src.latitude : (Math.random() - 0.5) * 180;
        const startLng = src ? src.longitude : (Math.random() - 0.5) * 360;

        const col = scoreToColor(dest.score);
        const color = col.replace('hsl(', 'hsla(').replace(')', ', 0.65)');

        return {
          startLat,
          startLng,
          endLat: dest.latitude,
          endLng: dest.longitude,
          color,
        };
      });

      return arcs;
    };

    const pool = backendEvents && backendEvents.length > 0 ? backendEvents : events;
    const arcs = buildArcs(pool, events);
    setArcsData(arcs);
  }, [events, backendEvents]);

  useEffect(() => {
    let mounted = true;

    async function fetchBackendEvents() {
      try {
        const res = await fetch('/api/events');
        if (!res.ok) {
          console.warn('Failed to fetch /api/events for arcs:', res.status);
          return;
        }
        const data = await res.json();
        if (mounted && Array.isArray(data)) {
          setBackendEvents(data as AttackEvent[]);
        }
      } catch (err) {
        console.error('Error fetching backend events for arcs:', err);
      }
    }

    fetchBackendEvents();
    return () => { mounted = false; };
  }, []);

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
        pointRadius={0.2}
        
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
