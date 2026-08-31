import React from 'react';
import { CertaintyLevel } from '@/types';
import { Activity } from 'lucide-react';

interface ConfidenceMeterProps {
  confidencePct: number;
  uncertaintyStd: number;
  certainty?: CertaintyLevel;
  showLabels?: boolean;
  compact?: boolean;
  className?: string;
}

export function ConfidenceMeter({
  confidencePct,
  uncertaintyStd,
  certainty = 'high',
  showLabels = true,
  compact = false,
  className = '',
}: ConfidenceMeterProps) {
  // Normalize certainty label
  const normKey = (certainty || 'high').toLowerCase() as 'high' | 'moderate' | 'low';
  const certaintyDisplay = {
    high: { label: 'HIGH CERTAINTY', color: 'text-cyan-400 bg-cyan-950/80 border-cyan-700/60' },
    moderate: { label: 'MODERATE CERTAINTY', color: 'text-amber-400 bg-amber-950/80 border-amber-700/60' },
    low: { label: 'LOW CERTAINTY', color: 'text-red-400 bg-red-950/80 border-red-700/60' },
  }[normKey] || { label: 'HIGH CERTAINTY', color: 'text-cyan-400 bg-cyan-950/80 border-cyan-700/60' };

  // Calculate uncertainty visual band (std in percentage points)
  const stdPct = uncertaintyStd * 100;
  const leftBound = Math.max(0, confidencePct - stdPct);
  const rightBound = Math.min(100, confidencePct + stdPct);

  return (
    <div className={`space-y-1.5 font-mono ${className}`}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 uppercase text-[11px] font-medium tracking-wider">
              Model Confidence
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-100 font-bold text-sm tracking-tight">
              {confidencePct.toFixed(1)}%
            </span>
            <span className="text-slate-400 text-xs font-normal">
              ±{uncertaintyStd.toFixed(3)}σ
            </span>
          </div>
        </div>
      )}

      {/* Visual Bar with Variance Band */}
      <div className="relative w-full h-3 bg-slate-900 border border-slate-800 rounded-xs overflow-hidden">
        {/* Subtle grid ticks on bar */}
        <div className="absolute inset-0 flex justify-between px-1 pointer-events-none opacity-20 z-10">
          <div className="w-[1px] h-full bg-slate-400" />
          <div className="w-[1px] h-full bg-slate-400" />
          <div className="w-[1px] h-full bg-slate-400" />
          <div className="w-[1px] h-full bg-slate-400" />
        </div>

        {/* Base confidence fill */}
        <div
          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500 ease-out"
          style={{ width: `${confidencePct}%` }}
        />

        {/* MC-Dropout Uncertainty Variance Band (highlighted strip) */}
        <div
          className="absolute top-0 bottom-0 bg-cyan-200/40 border-l border-r border-cyan-100/70"
          style={{
            left: `${leftBound}%`,
            width: `${Math.max(2, rightBound - leftBound)}%`,
          }}
          title={`Uncertainty Variance: [${leftBound.toFixed(1)}% – ${rightBound.toFixed(1)}%]`}
        />
      </div>

      {!compact && (
        <div className="flex items-center justify-between pt-0.5 text-[10px]">
          <span className="text-slate-500">MC-DROPOUT 10-PASS</span>
          <span className={`px-1.5 py-0.5 border rounded-xs font-semibold tracking-wider ${certaintyDisplay.color}`}>
            {certaintyDisplay.label}
          </span>
        </div>
      )}
    </div>
  );
}

export default ConfidenceMeter;
