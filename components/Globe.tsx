"use client";
import { useEffect, useRef, useState, useCallback } from "react";
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

const ARC_COLORS = [
  // Magenta/Pink tones
  ['rgba(255, 0, 128, 0.9)', 'rgba(255, 100, 180, 0.4)'],
  ['rgba(255, 50, 150, 0.9)', 'rgba(255, 150, 200, 0.4)'],
  ['rgba(220, 0, 100, 0.9)', 'rgba(255, 80, 160, 0.4)'],
  // Cyan/Blue tones
  ['rgba(0, 200, 255, 0.9)', 'rgba(100, 220, 255, 0.4)'],
  ['rgba(0, 150, 255, 0.9)', 'rgba(80, 180, 255, 0.4)'],
  ['rgba(50, 180, 255, 0.9)', 'rgba(120, 200, 255, 0.4)'],
  // Purple tones
  ['rgba(180, 0, 255, 0.9)', 'rgba(200, 100, 255, 0.4)'],
  ['rgba(150, 50, 255, 0.9)', 'rgba(180, 120, 255, 0.4)'],
];

// green theme matching DDoSAtlas design
const POINT_COLORS = [
  '#4ade80', // Bright green (green-400)
  '#22c55e', // Medium green
  '#16a34a', // Dark green
  '#84cc16', // Lime green
  '#65a30d', // Olive green
  '#10b981', // Emerald
  '#059669', // Teal green
  '#047857', // Dark teal
];

export default function GlobeComponent({ events }: GlobeComponentProps) {
  const globeEl = useRef<any>();
  const [arcsData, setArcsData] = useState<any[]>([]);
  const [pointsData, setPointsData] = useState<any[]>([]);
  const [ringsData, setRingsData] = useState<any[]>([]);
  const [backendEvents, setBackendEvents] = useState<AttackEvent[] | null>(null);

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.3;
      globeEl.current.controls().enableZoom = true;
      
      // Set initial camera position for a better view angle
      globeEl.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1000);
    }
  }, []);

  // Get arc color based on index for variety
  const getArcColor = useCallback((index: number) => {
    return ARC_COLORS[index % ARC_COLORS.length];
  }, []);

  // Get point color based on score and index - green theme
  const getPointColor = useCallback((score: number, index: number) => {
    // High severity gets bright green, medium gets medium green, low gets darker green
    if (score > 70) {
      return POINT_COLORS[index % 2]; // Bright greens (0,1)
    } else if (score > 50) {
      return POINT_COLORS[2 + (index % 2)]; // Medium greens (2,3)
    } else if (score > 30) {
      return POINT_COLORS[4 + (index % 2)]; // Light greens (4,5)
    } else {
      return POINT_COLORS[6 + (index % 2)]; // Dark greens (6,7)
    }
  }, []);

  useEffect(() => {
    if (!events || events.length === 0) {
      setPointsData([]);
      setArcsData([]);
      setRingsData([]);
      return;
    }

    // Compute score distribution
    const scores = events.map((e) => e.score).filter((s) => typeof s === 'number');
    const sorted = [...scores].sort((a, b) => a - b);
    const sMin = sorted[0] ?? 0;
    const sMax = sorted[sorted.length - 1] ?? 100;

    const normalizeSize = (score: number) => {
      const t = sMax === sMin 
        ? Math.max(0, Math.min(1, (score || 0) / 100)) 
        : Math.max(0, Math.min(1, (score - sMin) / (sMax - sMin)));
      // More dramatic size variation
      return 0.15 + Math.pow(t, 0.7) * 0.4;
    };

    const points = events.map((event, idx) => ({
      lat: event.latitude,
      lng: event.longitude,
      size: normalizeSize(event.score),
      color: getPointColor(event.score, idx),
      label: `${event.country}\n ${event.ip}\n Threat Score: ${event.score}`,
      altitude: 0.01,
    }));
    setPointsData(points);

    // Create expanding rings for high-severity attacks
    const rings = events
      .filter(e => e.score > 60)
      .slice(0, 15)
      .map((event, idx) => ({
        lat: event.latitude,
        lng: event.longitude,
        maxR: 3 + (event.score / 100) * 4,
        propagationSpeed: 2 + Math.random() * 2,
        repeatPeriod: 1500 + Math.random() * 1000,
        color: getPointColor(event.score, idx),
      }));
    setRingsData(rings);

    // Build beautiful arcs
    const buildArcs = (sourcePool: AttackEvent[], dests: AttackEvent[]) => {
      if (!dests || dests.length === 0) return [];

      const numSources = Math.max(1, Math.min(15, sourcePool.length));
      const sources = sourcePool.slice(0, numSources);

      const arcs = dests.slice(0, 40).map((dest, idx) => {
        let src = sources[idx % sources.length];

        if (src && src.ip === dest.ip && sources.length > 1) {
          src = sources[(idx + 1) % sources.length];
        }

        const startLat = src ? src.latitude : (Math.random() - 0.5) * 140;
        const startLng = src ? src.longitude : (Math.random() - 0.5) * 300;

        const colors = getArcColor(idx);
        
        // Calculate arc height based on distance
        const latDiff = Math.abs(dest.latitude - startLat);
        const lngDiff = Math.abs(dest.longitude - startLng);
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
        const arcAltitude = 0.1 + (distance / 180) * 0.4;

        return {
          startLat,
          startLng,
          endLat: dest.latitude,
          endLng: dest.longitude,
          color: colors,
          altitude: arcAltitude,
          // Thin, ink-like lines
          stroke: 0.08 + (dest.score / 100) * 0.18,
          // Swift, minimal dash animation
          dashLength: 0.05 + Math.random() * 0.05,
          dashGap: 0.01 + Math.random() * 0.02,
          animateTime: 600 + Math.random() * 400,
        };
      });

      return arcs;
    };

    const pool = backendEvents && backendEvents.length > 0 ? backendEvents : events;
    const arcs = buildArcs(pool, events);
    setArcsData(arcs);
  }, [events, backendEvents, getArcColor, getPointColor]);

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
    <div className="w-full h-full relative">
      {/* Ambient glow overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          // Subtle blue vignette to blend with page background
          background: 'radial-gradient(ellipse at 50% 45%, rgba(0,40,80,0.15) 0%, rgba(0,20,40,0.35) 55%, rgba(0,0,0,0.7) 100%)',
        }}
      />
      
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        pointsData={pointsData}
        pointAltitude="altitude"
        pointColor="color"
        pointLabel="label"
        pointRadius="size"
        pointsMerge={false}
        
        arcsData={arcsData}
        arcColor="color"
        arcAltitude="altitude"
        arcStroke="stroke"
        arcDashLength="dashLength"
        arcDashGap="dashGap"
        arcDashAnimateTime="animateTime"
        arcDashInitialGap={() => Math.random()}
        
        // Rings for impact visualization
        ringsData={ringsData}
        ringColor="color"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        ringAltitude={0.01}
        
        // Atmosphere - dramatic blue/cyan glow
        atmosphereColor="#00d4ff"
        atmosphereAltitude={0.25}
        
        // Globe appearance
        showGlobe={true}
        showAtmosphere={true}
        
        enablePointerInteraction={true}
      />
    </div>
  );
}
