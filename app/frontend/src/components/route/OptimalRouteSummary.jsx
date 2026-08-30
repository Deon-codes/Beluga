import { useNavigate } from 'react-router-dom';
import { Leaf, Clock, Navigation, ShieldCheck, Download, FileText, ArrowRight } from 'lucide-react';
import { getRouteOptimizationSummary, sampleDebrisLocations } from '../../data/routeMockData';

export default function OptimalRouteSummary({ selectedRoute, onReset }) {
  const navigate = useNavigate();
  const summary = getRouteOptimizationSummary(selectedRoute);

  return (
    <div className="card p-6 space-y-6 bg-gradient-to-br from-light-surface via-light-surface to-cyan-500/5 dark:from-dark-surface dark:via-dark-surface dark:to-cyan-500/10 border-cyan/30">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light-border dark:border-dark-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck size={14} /> ECO-OPTIMIZED ROUTE READY
            </span>
            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              Simulation ID: #ECO-9482
            </span>
          </div>
          <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mt-1">
            Recommended Cleanup Strategy
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/detections')}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <FileText size={16} /> View Detections
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="btn-primary text-sm flex items-center gap-2 bg-gradient-to-r from-ocean-blue to-cyan hover:opacity-95"
          >
            <Download size={16} /> Export Cleanup Plan
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border space-y-1">
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-1.5">
            <Navigation size={14} className="text-ocean-blue dark:text-cyan" />
            Total Route Distance
          </div>
          <div className="text-2xl font-black text-light-text dark:text-dark-text">
            {selectedRoute.distanceKm} <span className="text-sm font-normal text-slate-500">km</span>
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            ↓ {summary.distanceSaved} km saved ({summary.distanceReductionPct}%)
          </div>
        </div>

        <div className="p-4 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border space-y-1">
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-1.5">
            <Clock size={14} className="text-amber-500" />
            Estimated Duration
          </div>
          <div className="text-2xl font-black text-light-text dark:text-dark-text">
            {selectedRoute.timeMin} <span className="text-sm font-normal text-slate-500">min</span>
          </div>
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary font-medium">
            Avg speed 8 knots
          </div>
        </div>

        <div className="p-4 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border space-y-1">
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-1.5">
            <Leaf size={14} className="text-emerald-500" />
            Estimated CO₂ Emissions
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {selectedRoute.co2Kg} <span className="text-sm font-normal text-slate-500">kg</span>
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            ↓ {summary.co2Saved} kg reduction ({summary.co2ReductionPct}%)
          </div>
        </div>

        <div className="p-4 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border space-y-1">
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
            Debris Priority Coverage
          </div>
          <div className="text-2xl font-black text-light-text dark:text-dark-text flex items-center gap-2">
            {summary.debrisCount} <span className="text-sm font-normal text-slate-500">targets</span>
          </div>
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-1">
            <span className="text-red-500 font-bold">🔴 {summary.highPriorityCount}</span>
            <span className="text-amber-500 font-bold">🟠 {summary.medPriorityCount}</span>
            <span className="text-emerald-500 font-bold">🟢 {summary.lowPriorityCount}</span>
          </div>
        </div>
      </div>

      {/* Route Order Breakdown */}
      <div className="p-4 rounded-xl bg-light-surface/60 dark:bg-dark-surface/60 border border-light-border dark:border-dark-border space-y-3 overflow-hidden">
        <div className="text-xs font-semibold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span>Optimal Traversal Sequence</span>
          <span className="text-[11px] normal-case text-cyan-600 dark:text-cyan-400">Priority + Distance Weighting</span>
        </div>

        <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-2 scrollbar-thin">
          {selectedRoute.sequence.map((id, idx) => {
            const debris = sampleDebrisLocations.find((d) => d.id === id);
            const isStart = id === 'START';

            return (
              <div key={id} className="flex items-center gap-2 shrink-0">
                <div
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${
                    isStart
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-600 dark:text-cyan-400'
                      : debris?.priority === 'HIGH'
                      ? 'bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400'
                      : debris?.priority === 'MEDIUM'
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {isStart ? '🚢 Base Start' : `${id} (${debris?.priority})`}
                </div>
                {idx < selectedRoute.sequence.length - 1 && (
                  <ArrowRight size={14} className="text-slate-400 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footnote */}
      <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary bg-slate-500/5 p-3 rounded-lg flex items-center justify-between">
        <span>* Environmental emission & distance figures are calculated via simulated hydro-geodesic route modeling.</span>
        {onReset && (
          <button onClick={onReset} className="text-ocean-blue dark:text-cyan font-semibold hover:underline">
            Re-run Simulation
          </button>
        )}
      </div>
    </div>
  );
}
