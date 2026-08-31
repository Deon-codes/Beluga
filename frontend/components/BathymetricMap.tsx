'use client';

import React, { useState, useRef } from 'react';
import { AnomalyDetection, SurveyRecord } from '@/types';
import Link from 'next/link';
import { MapPin, Navigation, Layers, Compass, Crosshair, ChevronRight } from 'lucide-react';
import { RiskBadge } from '@/components/RiskBadge';

interface BathymetricMapProps {
  surveys: SurveyRecord[];
  anomalies: AnomalyDetection[];
  onSelectAnomaly?: (anomaly: AnomalyDetection) => void;
  className?: string;
}

export function BathymetricMap({ surveys, anomalies, onSelectAnomaly, className = '' }: BathymetricMapProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [showContours, setShowContours] = useState<boolean>(true);
  const [showTracks, setShowTracks] = useState<boolean>(true);
  const [selectedPin, setSelectedPin] = useState<AnomalyDetection | null>(null);

  // Map geographic bounding box (Bay of Bengal / Chennai offshore baseline)
  // Lat: 13.04 to 13.16 N, Lon: 80.28 to 80.40 E
  const minLat = 13.04;
  const maxLat = 13.16;
  const minLon = 80.28;
  const maxLon = 80.40;

  const latToY = (lat: number) => {
    const norm = (maxLat - lat) / (maxLat - minLat);
    return Math.max(8, Math.min(92, norm * 100));
  };

  const lonToX = (lon: number) => {
    const norm = (lon - minLon) / (maxLon - minLon);
    return Math.max(8, Math.min(92, norm * 100));
  };

  return (
    <div className={`relative bg-[#070d1e] border border-[#1e293b] rounded-xs overflow-hidden ${className}`}>
      {/* Top Map HUD Telemetry */}
      <div className="absolute top-3 left-3 z-10 bg-[#0b1329]/90 backdrop-blur-xs border border-[#1e293b] px-3 py-1.5 rounded-xs text-xs font-mono flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>BATHYMETRIC SEABED TACTICAL GRID</span>
        </div>
        <span className="text-slate-700">|</span>
        <span className="text-slate-400">BAY OF BENGAL (SECTOR 04)</span>
        <span className="text-slate-700">|</span>
        <span className="text-cyan-400 font-mono-tabular">13.0827°N, 80.3128°E</span>
      </div>

      {/* Map Layer Controls (Top Right) */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-[#0b1329]/90 backdrop-blur-xs border border-[#1e293b] p-1 rounded-xs">
        <button
          onClick={() => setShowContours(!showContours)}
          className={`px-2 py-1 text-[11px] font-mono rounded-xs transition-colors ${
            showContours
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          CONTOURS
        </button>
        <button
          onClick={() => setShowTracks(!showTracks)}
          className={`px-2 py-1 text-[11px] font-mono rounded-xs transition-colors ${
            showTracks
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          TRACKLINES
        </button>
        <div className="w-[1px] h-4 bg-slate-800 mx-1" />
        <button
          onClick={() => setZoom(Math.min(2.5, zoom + 0.3))}
          className="px-2 py-0.5 text-xs text-cyan-400 hover:bg-slate-800 rounded-xs font-bold"
        >
          +
        </button>
        <button
          onClick={() => setZoom(Math.max(0.8, zoom - 0.3))}
          className="px-2 py-0.5 text-xs text-cyan-400 hover:bg-slate-800 rounded-xs font-bold"
        >
          -
        </button>
      </div>

      {/* Vector Geospatial Layer */}
      <div
        className="w-full h-full relative transition-transform duration-300 ease-out sonar-grid"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
      >
        {/* SVG Bathymetric Contours & Survey Tracklines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-slate-800">
          <defs>
            <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.3" />
            </linearGradient>
            <radialGradient id="hotspotGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Bathymetry isobath lines */}
          {showContours && (
            <g className="opacity-40">
              <path
                d="M 0,120 Q 250,90 500,160 T 1000,130"
                fill="none"
                stroke="#0e3a5a"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text x="50" y="115" fill="#0284c7" fontSize="9" fontFamily="monospace">
                -20m ISOBATH
              </text>

              <path
                d="M 0,260 Q 300,210 600,290 T 1000,240"
                fill="none"
                stroke="#0e3a5a"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text x="50" y="255" fill="#0284c7" fontSize="9" fontFamily="monospace">
                -50m ISOBATH
              </text>

              <path
                d="M 0,420 Q 200,380 500,450 T 1000,400"
                fill="none"
                stroke="#0e3a5a"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text x="50" y="415" fill="#0284c7" fontSize="9" fontFamily="monospace">
                -100m ISOBATH
              </text>
            </g>
          )}

          {/* Ghost Net Cluster Hotspot Glow */}
          <circle cx="58%" cy="48%" r="65" fill="url(#hotspotGlow)" />
          <circle cx="58%" cy="48%" r="35" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" />
          <text x="63%" y="46%" fill="#ef4444" fontSize="10" fontFamily="monospace" fontWeight="bold">
            GHOST NET CLUSTER #1
          </text>

          {/* Survey Vessel Tracklines */}
          {showTracks && (
            <g>
              {/* Pass 03 Trackline */}
              <line x1="22%" y1="78%" x2="72%" y2="28%" stroke="url(#trackGradient)" strokeWidth="2.5" strokeDasharray="6 3" />
              {/* Vessel position */}
              <circle cx="72%" cy="28%" r="5" fill="#06b6d4" />
              <circle cx="72%" cy="28%" r="10" fill="none" stroke="#06b6d4" className="animate-ping" />
              <text x="74%" y="26%" fill="#22d3ee" fontSize="10" fontFamily="monospace" fontWeight="bold">
                ORV SAGAR NIDHI (HDG 042°)
              </text>

              {/* Pass 01 Trackline */}
              <line x1="15%" y1="45%" x2="55%" y2="65%" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />
              <text x="56%" y="67%" fill="#38bdf8" fontSize="9" fontFamily="monospace">
                RV SAGAR PASCHIMI
              </text>
            </g>
          )}
        </svg>

        {/* Hazard Anomaly Pins */}
        {anomalies.map((anom) => {
          const lat = anom.location.lat ?? 13.0827;
          const lon = anom.location.lon ?? 80.3128;
          const top = latToY(lat);
          const left = lonToX(lon);
          const isCritical = anom.risk === 'CRITICAL';
          const isHigh = anom.risk === 'HIGH';
          const pinColor = isCritical ? 'text-red-400 bg-red-950 border-red-500' : isHigh ? 'text-orange-400 bg-orange-950 border-orange-500' : 'text-cyan-400 bg-cyan-950 border-cyan-500';

          return (
            <div
              key={anom.id}
              style={{ top: `${top}%`, left: `${left}%` }}
              onClick={() => {
                setSelectedPin(anom);
                if (onSelectAnomaly) onSelectAnomaly(anom);
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
            >
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full border shadow-lg transition-transform group-hover:scale-125 ${pinColor} ${
                  isCritical ? 'animate-bounce' : ''
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
              </div>

              {/* Hover Tag */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-7 hidden group-hover:flex flex-col bg-[#0b1329] border border-cyan-500 text-slate-100 text-[10px] p-2 rounded-xs whitespace-nowrap shadow-2xl z-30 font-mono">
                <span className="font-bold text-cyan-300">{anom.class_name}</span>
                <span className="text-slate-400">{anom.id} | {anom.risk}</span>
                <span className="text-slate-400 font-mono-tabular">
                  {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Pin Callout Drawer (Bottom Left) */}
      {selectedPin && (
        <div className="absolute bottom-3 left-3 z-30 bg-[#0b1329]/95 backdrop-blur-md border border-cyan-600 p-3 rounded-xs text-xs font-mono max-w-sm space-y-2 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-cyan-300">{selectedPin.class_name}</span>
            <button onClick={() => setSelectedPin(null)} className="text-slate-400 hover:text-slate-200">
              ✕
            </button>
          </div>
          <div className="flex items-center gap-2">
            <RiskBadge level={selectedPin.risk} size="sm" />
            <span className="text-slate-400">CONF: <strong className="text-slate-200">{selectedPin.confidence_pct}%</strong></span>
          </div>
          <p className="text-[11px] text-slate-300 leading-tight">
            Dimensions: {selectedPin.dimensions_m.length_m ?? selectedPin.dimensions_m.length ?? 0}m × {selectedPin.dimensions_m.width_m ?? selectedPin.dimensions_m.width ?? 0}m × {selectedPin.dimensions_m.height_m ?? selectedPin.dimensions_m.height ?? 0}m
          </p>
          <div className="pt-1 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono-tabular">
              {(selectedPin.location.lat ?? 13.0827).toFixed(6)}°N, {(selectedPin.location.lon ?? 80.3128).toFixed(6)}°E
            </span>
            <Link
              href={`/surveys/${selectedPin.survey_id || 'SURV-2026-NIOT-088'}`}
              className="text-[11px] text-cyan-400 hover:text-cyan-200 font-bold flex items-center gap-1 hover:underline"
            >
              INSPECT IN WATERFALL <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Bottom Right Bathymetric Legend */}
      <div className="absolute bottom-3 right-3 z-10 bg-[#0b1329]/90 backdrop-blur-xs border border-[#1e293b] px-3 py-2 rounded-xs text-[10px] font-mono text-slate-400 space-y-1">
        <div className="font-bold text-slate-200 uppercase tracking-wider">MAP LEGEND</div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          <span>Critical Risk (Wreck / UXO / Snag)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
          <span>High Risk (Ghost Net / Pipeline)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
          <span>Infrastructure / Minor Anomaly</span>
        </div>
      </div>
    </div>
  );
}

export default BathymetricMap;
