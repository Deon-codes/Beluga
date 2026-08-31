'use client';

import React from 'react';
import { ProcessingStageStatus, ProcessingStageId } from '@/types';
import { CheckCircle2, Loader2, Clock, CircleAlert, Cpu } from 'lucide-react';

interface ProcessingStepperProps {
  stages?: ProcessingStageStatus[];
  currentStageId?: ProcessingStageId;
  overallProgress?: number;
  className?: string;
}

const DEFAULT_STAGES: ProcessingStageStatus[] = [
  { id: 'INGESTION', name: '1. RAW INGESTION', description: 'Dual-channel SSS demodulation & slant-range correction', status: 'completed', elapsed_ms: 142 },
  { id: 'DENOISING', name: '2. SPECKLE DENOISE', description: 'Lee-Sigma filtering & contrast normalization', status: 'completed', elapsed_ms: 380 },
  { id: 'YOLO_INFERENCE', name: '3. YOLOv8s INFERENCE', description: 'Multi-scale acoustic backscatter feature extraction', status: 'completed', elapsed_ms: 520 },
  { id: 'FILTERING', name: '4. NOISE & IOU FILTER', description: 'Stripe noise rejection & tile boundary NMS', status: 'completed', elapsed_ms: 210 },
  { id: 'SHADOW_SIZING', name: '5. SHADOW SIZING', description: 'Trigonometric relief height derivation from nadir', status: 'completed', elapsed_ms: 290 },
  { id: 'MC_DROPOUT', name: '6. MC-DROPOUT UNCERTAINTY', description: '10-pass stochastic forward sampling (±σ)', status: 'completed', elapsed_ms: 410 },
  { id: 'GEOTAGGING', name: '7. WGS84 GEOTAGGING', description: 'WGS84 ellipsoid projection & layback transform', status: 'completed', elapsed_ms: 180 },
  { id: 'COMPLETED', name: '8. REPORT PERSISTENCE', description: 'Structured JSON/CSV hydrographic report generation', status: 'completed', elapsed_ms: 95 },
];

export function ProcessingStepper({
  stages = DEFAULT_STAGES,
  className = '',
}: ProcessingStepperProps) {
  const completedCount = stages.filter((s) => s.status === 'completed').length;
  const activeCount = stages.filter((s) => s.status === 'active').length;
  const isAllComplete = completedCount === stages.length;
  const totalElapsed = stages.reduce((acc, s) => acc + (s.elapsed_ms || 0), 0);

  return (
    <div className={`bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3 space-y-3  ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            Pipeline Processing
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className={`font-bold  ${isAllComplete ? 'text-emerald-600 dark:text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
            {completedCount}/{stages.length} COMPLETE
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-500 dark:text-slate-500 dark:text-slate-400  flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500 dark:text-slate-500 dark:text-slate-400" />
            {totalElapsed > 0 ? `${(totalElapsed / 1000).toFixed(2)}s` : activeCount > 0 ? 'PROCESSING' : 'READY'}
          </span>
        </div>
      </div>

      {/* Multi-segment Dynamic Progress Bar */}
      <div
        className="grid gap-1 py-0.5"
        style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}
      >
        {stages.map((st, i) => {
          const isDone = st.status === 'completed';
          const isAct = st.status === 'active';
          const isFail = st.status === 'failed';
          return (
            <div
              key={st.id || i}
              className={`h-1.5 rounded-full transition-all ${
                isDone
                  ? 'bg-emerald-400 shadow-xs shadow-emerald-500/50'
                  : isAct
                  ? 'bg-cyan-400 animate-pulse ring-1 ring-cyan-300'
                  : isFail
                  ? 'bg-red-500'
                  : 'bg-[#1e293b]'
              }`}
              title={`${st.name}: ${st.status}`}
            />
          );
        })}
      </div>

      <div className="space-y-1.5">
        {stages.map((stage, idx) => {
          const isCompleted = stage.status === 'completed';
          const isActive = stage.status === 'active';
          const isFailed = stage.status === 'failed';
          const isPending = stage.status === 'pending';

          return (
            <div
              key={stage.id || idx}
              className={`flex items-center justify-between p-2 rounded-xl text-xs border transition-colors ${
                isCompleted
                  ? 'bg-[#071329] border-cyan-900/60 text-slate-700 dark:text-slate-700 dark:text-slate-200'
                  : isActive
                  ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 text-cyan-200 ring-1 ring-cyan-500/40 animate-pulse'
                  : isFailed
                  ? 'bg-red-950/40 border-red-800 text-red-300'
                  : 'bg-[#050b18] border-slate-200 dark:border-zinc-800/80 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="shrink-0">
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-600 dark:text-emerald-400" />}
                  {isActive && <Loader2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-300 animate-spin" />}
                  {isPending && (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-700 flex items-center justify-center text-[9px] text-slate-600 ">
                      {idx + 1}
                    </div>
                  )}
                  {isFailed && <CircleAlert className="w-3.5 h-3.5 text-red-600 dark:text-red-600 dark:text-red-400" />}
                </div>

                <div className="truncate">
                  <span
                    className={`font-semibold tracking-wide ${
                      isActive ? 'text-blue-500 dark:text-blue-300' : isCompleted ? 'text-slate-700 dark:text-slate-700 dark:text-slate-200' : 'text-slate-500'
                    }`}
                  >
                    {stage.name}
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-500 dark:text-slate-400 truncate leading-tight">
                    {stage.description}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 pl-2">
                {isCompleted && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-600 dark:text-emerald-400/90  font-bold">
                    {stage.elapsed_ms ? `${stage.elapsed_ms}ms` : 'DONE'}
                  </span>
                )}
                {isActive && (
                  <span className="text-[10px] text-blue-500 dark:text-blue-300 font-bold animate-pulse">
                    ACTIVE
                  </span>
                )}
                {isPending && (
                  <span className="text-[10px] text-slate-600">
                    QUEUED
                  </span>
                )}
                {isFailed && (
                  <span className="text-[10px] text-red-600 dark:text-red-600 dark:text-red-400 font-bold">
                    FAILED
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProcessingStepper;
