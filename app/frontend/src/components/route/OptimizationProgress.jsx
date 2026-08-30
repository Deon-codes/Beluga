import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { candidateRoutes } from '../../data/routeMockData';

export default function OptimizationProgress({
  activeRouteIndex,
  isOptimizing,
  progressPct,
  onSelectRoute,
}) {
  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-light-text dark:text-dark-text flex items-center gap-2">
            {isOptimizing ? (
              <>
                <Loader2 className="animate-spin text-ocean-blue dark:text-cyan" size={20} />
                Evaluating Candidate Cleanup Routes...
              </>
            ) : (
              <>
                <Sparkles className="text-emerald-500" size={20} />
                Candidate Route Evaluation Complete
              </>
            )}
          </h3>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
            Simulating TSP priority-distance algorithms to minimize marine fuel consumption & CO₂
          </p>
        </div>

        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-ocean-blue/10 dark:bg-cyan/10 text-ocean-blue dark:text-cyan">
          {progressPct}% Completed
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-light-border dark:bg-dark-border h-2 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-ocean-blue via-cyan to-emerald-400 h-full transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Route Candidates List */}
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">
          Evaluated Candidate Sequences
        </div>

        <div className="grid grid-cols-1 gap-3">
          {candidateRoutes.map((route, idx) => {
            const isCurrent = activeRouteIndex === idx;
            const isChecked = activeRouteIndex > idx || (!isOptimizing && route.isOptimal);

            return (
              <div
                key={route.id}
                onClick={() => !isOptimizing && onSelectRoute && onSelectRoute(idx)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-ocean-blue dark:border-cyan bg-ocean-blue/5 dark:bg-cyan/10 ring-2 ring-ocean-blue/20 dark:ring-cyan/20'
                    : route.isOptimal && !isOptimizing
                    ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                    : 'border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-light-text dark:text-dark-text">
                      {route.id}
                    </span>
                    <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                      ({route.name})
                    </span>
                  </div>

                  {route.isOptimal && !isOptimizing && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500 text-white flex items-center gap-1">
                      <CheckCircle2 size={12} /> RECOMMENDED
                    </span>
                  )}
                  {isCurrent && isOptimizing && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-white animate-pulse">
                      TESTING
                    </span>
                  )}
                </div>

                <div className="text-xs font-mono text-light-text-secondary dark:text-dark-text-secondary mb-3">
                  {route.sequence.join(' → ')}
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-light-border/60 dark:border-dark-border/60">
                  <div>
                    <span className="text-light-text-secondary dark:text-dark-text-secondary">Distance: </span>
                    <strong className="text-light-text dark:text-dark-text">{route.distanceKm} km</strong>
                  </div>
                  <div>
                    <span className="text-light-text-secondary dark:text-dark-text-secondary">CO₂: </span>
                    <strong className="text-light-text dark:text-dark-text">{route.co2Kg} kg</strong>
                  </div>
                  <div>
                    <span className="text-light-text-secondary dark:text-dark-text-secondary">Time: </span>
                    <strong className="text-light-text dark:text-dark-text">{route.timeMin} m</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
