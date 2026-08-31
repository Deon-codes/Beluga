import { useState, useEffect } from 'react';
import { detections } from '../../data/mockData';

function formatTimeAgo(seconds) {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function RecentDetections() {
  const [displayDetections, setDisplayDetections] = useState(detections.slice(0, 4));

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'HIGH':
        return 'badge-high';
      case 'MEDIUM':
        return 'badge-medium';
      case 'LOW':
        return 'badge-low';
      default:
        return 'badge-low';
    }
  };

  return (
    <div className="card h-full rounded-2xl p-5">
      <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Recent Detections</h3>
      <div className="space-y-3">
        {displayDetections.map((detection) => (
          <div
            key={detection.id}
            className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-sky-200 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-sky-500/40 dark:hover:bg-slate-800"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900 transition-colors group-hover:text-sky-600 dark:text-slate-100 dark:group-hover:text-cyan-300">
                  {detection.id}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {detection.classification}
                </p>
              </div>
              <span className={`badge text-[10px] ${getRiskColor(detection.risk)}`}>
                {detection.risk}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
              <span>{(detection.confidence * 100).toFixed(1)}%</span>
              <span>{formatTimeAgo(detection.detectedAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}