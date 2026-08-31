import React from 'react';
import { GeoConfidence } from '@/types';
import { Crosshair, Navigation, MapPin } from 'lucide-react';

interface GeoBadgeProps {
  lat: number;
  lon: number;
  confidence: GeoConfidence;
  compact?: boolean;
  className?: string;
}

export function GeoBadge({ lat, lon, confidence, compact = false, className = '' }: GeoBadgeProps) {
  const isMeasured = confidence === 'measured';

  const formatCoordinate = (coord: number, isLatitude: boolean) => {
    const absCoord = Math.abs(coord).toFixed(6);
    const hemisphere = isLatitude ? (coord >= 0 ? 'N' : 'S') : coord >= 0 ? 'E' : 'W';
    return `${absCoord}°${hemisphere}`;
  };

  const formattedLat = formatCoordinate(lat, true);
  const formattedLon = formatCoordinate(lon, false);

  return (
    <div
      className={`inline-flex items-center gap-2  text-xs border rounded-xl px-2 py-1 ${
        isMeasured
          ? 'bg-[#071a2e] border-blue-500/50 text-cyan-200'
          : 'bg-[#1f1708] border-amber-500/50 text-amber-200'
      } ${className}`}
    >
      <div className="flex items-center gap-1 shrink-0 font-medium">
        {isMeasured ? (
          <Crosshair className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-pulse" />
        ) : (
          <Navigation className="w-3.5 h-3.5 text-amber-600 dark:text-amber-600 dark:text-amber-400" />
        )}
        <span
          className={`text-[10px] font-bold tracking-wider px-1 py-0.5 rounded-xl uppercase ${
            isMeasured ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
          }`}
        >
          {isMeasured ? 'MEASURED GPS' : 'ESTIMATED ANCHOR'}
        </span>
      </div>

      {!compact && <span className="text-slate-500">|</span>}

      <div className="flex items-center gap-1.5  font-medium tracking-tight text-slate-900 dark:text-slate-900 dark:text-slate-100">
        <MapPin className="w-3 h-3 text-slate-500 dark:text-slate-500 dark:text-slate-400" />
        <span>{formattedLat}</span>
        <span className="text-slate-500">,</span>
        <span>{formattedLon}</span>
      </div>
    </div>
  );
}

export default GeoBadge;
