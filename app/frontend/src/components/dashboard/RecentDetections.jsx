import { Link } from 'react-router-dom';
import { detections } from '../../data/mockData';

function formatTimeAgo(seconds) {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function riskClass(risk) {
  if (risk === 'HIGH') return 'badge-high';
  if (risk === 'MEDIUM') return 'badge-medium';
  return 'badge-low';
}

export default function RecentDetections() {
  return (
    <div className="glass-panel flex-1 rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Recent Detections</h3>
        <Link to="/detections" className="text-[10px] font-semibold tracking-wide text-cyan-300">VIEW ALL</Link>
      </div>
      <div className="space-y-3">
        {detections.slice(0, 2).map((detection) => (
          <div key={detection.id} className="rounded-lg border border-cyan-400/10 bg-black/20 p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{detection.id} {detection.classification}</p>
              </div>
              <span className={riskClass(detection.risk)}>{detection.risk}</span>
            </div>
            <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-gradient-to-r from-amber-400 to-cyan-400" style={{ width: `${detection.confidence * 100}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{(detection.confidence * 100).toFixed(1)}%</span>
              <span>{formatTimeAgo(detection.detectedAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
