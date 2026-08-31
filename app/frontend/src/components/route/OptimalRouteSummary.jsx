import { useNavigate } from 'react-router-dom';
import { Leaf, Clock, Navigation, ShieldCheck, Download, FileText, ArrowRight } from 'lucide-react';
import { getRouteOptimizationSummary, sampleDebrisLocations } from '../../data/routeMockData';

export default function OptimalRouteSummary({ selectedRoute, onReset }) {
  const navigate = useNavigate();
  const summary = getRouteOptimizationSummary(selectedRoute);

  return (
    <div className="relative space-y-4">
      <div className="glass-panel ml-auto max-w-md rounded-xl p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">Route D (Eco-Optimized Priority Route)</p>
          <span className="rounded bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">RECOMMENDED</span>
        </div>
        <p className="font-mono text-[11px] text-slate-400">{selectedRoute.sequence.join(' -> ')}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-300">
          <div>Distance: <strong className="text-white">{selectedRoute.distanceKm} km</strong></div>
          <div>CO₂: <strong className="text-white">{selectedRoute.co2Kg} kg</strong></div>
          <div>Time: <strong className="text-white">{selectedRoute.timeMin} m</strong></div>
        </div>
      </div>

      <div className="glass-panel space-y-6 rounded-xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-extrabold text-emerald-400">
                <ShieldCheck size={14} /> ECO-OPTIMIZED ROUTE READY
              </span>
              <span className="text-xs text-slate-400">Simulation ID: #ECO-9482</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold">Recommended Cleanup Strategy</h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/detections')} className="btn-secondary flex items-center gap-2 text-sm">
              <FileText size={16} /> View Detections
            </button>
            <button onClick={() => navigate('/reports')} className="btn-primary flex items-center gap-2 text-sm">
              <Download size={16} /> Export Cleanup Plan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-cyan-400/10 bg-black/20 p-4">
            <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
              <Navigation size={14} className="text-cyan-300" /> Total Route Distance
            </div>
            <div className="text-2xl font-black">{selectedRoute.distanceKm} <span className="text-sm font-normal text-slate-500">km</span></div>
            <div className="text-xs font-medium text-emerald-400">↓ {summary.distanceSaved} km saved ({summary.distanceReductionPct}%)</div>
          </div>
          <div className="rounded-xl border border-cyan-400/10 bg-black/20 p-4">
            <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
              <Clock size={14} className="text-amber-400" /> Estimated Duration
            </div>
            <div className="text-2xl font-black">{selectedRoute.timeMin} <span className="text-sm font-normal text-slate-500">min</span></div>
            <div className="text-xs text-slate-400">Avg speed 8 knots</div>
          </div>
          <div className="rounded-xl border border-cyan-400/10 bg-black/20 p-4">
            <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
              <Leaf size={14} className="text-emerald-400" /> Estimated CO₂ Emissions
            </div>
            <div className="text-2xl font-black text-emerald-400">{selectedRoute.co2Kg} <span className="text-sm font-normal text-slate-500">kg</span></div>
            <div className="text-xs font-medium text-emerald-400">↓ {summary.co2Saved} kg reduction ({summary.co2ReductionPct}%)</div>
          </div>
          <div className="rounded-xl border border-cyan-400/10 bg-black/20 p-4">
            <div className="mb-1 text-xs text-slate-400">Debris Priority Coverage</div>
            <div className="text-2xl font-black">{summary.debrisCount} <span className="text-sm font-normal text-slate-500">targets</span></div>
            <div className="mt-1 flex gap-2 text-xs">
              <span className="text-red-400">{summary.highPriorityCount} HIGH</span>
              <span className="text-amber-400">{summary.medPriorityCount} MED</span>
              <span className="text-emerald-400">{summary.lowPriorityCount} LOW</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 overflow-hidden rounded-xl border border-cyan-400/10 bg-black/20 p-4">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Optimal Traversal Sequence</span>
            <span className="normal-case text-cyan-300">Priority + Distance Weighting</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {selectedRoute.sequence.map((id, idx) => {
              const debris = sampleDebrisLocations.find((d) => d.id === id);
              const isStart = id === 'START';
              const tone = isStart
                ? 'bg-slate-700 text-slate-100'
                : debris?.priority === 'HIGH'
                  ? 'bg-red-900/70 text-red-200'
                  : debris?.priority === 'MEDIUM'
                    ? 'bg-amber-900/70 text-amber-200'
                    : 'bg-emerald-900/70 text-emerald-200';
              return (
                <div key={id} className="flex shrink-0 items-center gap-2">
                  <div className={`rounded-full px-3 py-1.5 text-xs font-bold ${tone}`}>
                    {isStart ? 'Base Start' : `${id} (${debris?.priority})`}
                  </div>
                  {idx < selectedRoute.sequence.length - 1 && <ArrowRight size={14} className="shrink-0 text-slate-500" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>* Environmental emission & distance figures are calculated via simulated hydro-geodesic route modeling.</span>
          {onReset && (
            <button onClick={onReset} className="font-semibold text-cyan-300 hover:underline">
              Re-run Simulation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
