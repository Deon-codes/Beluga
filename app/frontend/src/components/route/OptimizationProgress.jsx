import { CheckCircle2, Loader2 } from 'lucide-react';
import { candidateRoutes } from '../../data/routeMockData';

export default function OptimizationProgress({
  activeRouteIndex,
  isOptimizing,
  progressPct,
  onSelectRoute,
}) {
  return (
    <div className="glass-panel space-y-5 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold">
            {isOptimizing ? (
              <>
                <Loader2 className="animate-spin text-cyan-300" size={18} />
                Evaluating Candidate Cleanup Routes...
              </>
            ) : (
              <>Candidate Route Evaluation Complete</>
            )}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Simulating TSP priority-distance algorithms to minimize marine fuel consumption & CO2
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/30 text-[10px] font-bold text-cyan-300">
          {progressPct}%
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full bg-[#00d1c1] transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Evaluated Candidate Sequences
        </div>
        {candidateRoutes.map((route, idx) => {
          const isCurrent = activeRouteIndex === idx;
          return (
            <button
              key={route.id}
              type="button"
              onClick={() => !isOptimizing && onSelectRoute?.(idx)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                route.isOptimal && !isOptimizing
                  ? 'border-emerald-400/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : isCurrent
                    ? 'border-cyan-400/40 bg-cyan-400/10'
                    : 'border-cyan-400/10 bg-black/20'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-bold">
                  {route.id} <span className="font-normal text-slate-400">({route.name})</span>
                </div>
                {route.isOptimal && !isOptimizing && (
                  <span className="flex items-center gap-1 rounded bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    <CheckCircle2 size={12} /> RECOMMENDED
                  </span>
                )}
                {isCurrent && isOptimizing && (
                  <span className="animate-pulse rounded bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">TESTING</span>
                )}
              </div>
              <div className="mb-3 font-mono text-[11px] text-slate-400">{route.sequence.join(' → ')}</div>
              <div className="flex justify-between border-t border-cyan-400/10 pt-2 text-xs">
                <span>Distance <strong>{route.distanceKm} km</strong></span>
                <span>CO2 <strong>{route.co2Kg} kg</strong></span>
                <span>Time <strong>{route.timeMin} m</strong></span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
