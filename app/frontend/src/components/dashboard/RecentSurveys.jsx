import { Link } from 'react-router-dom';
import { surveys } from '../../data/mockData';
import { CheckCircle, Loader } from 'lucide-react';

export default function RecentSurveys() {
  return (
    <div className="glass-panel flex-1 rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Recent Surveys</h3>
        <Link to="/history" className="text-[10px] font-semibold tracking-wide text-cyan-300">VIEW ALL</Link>
      </div>
      <div className="space-y-3">
        {surveys.slice(0, 2).map((survey) => (
          <div key={survey.id} className="rounded-lg border border-cyan-400/10 bg-black/20 p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{survey.id} {survey.location}</p>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-300">
                {survey.status === 'Processed' ? (
                  <CheckCircle size={14} className="text-emerald-400" />
                ) : (
                  <Loader size={14} className="animate-spin text-cyan-300" />
                )}
                {survey.status}
              </div>
            </div>
            {survey.status === 'Processed' ? (
              <p className="text-[11px] text-slate-400">{survey.detections} objects detected</p>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full bg-[#00d1c1]" style={{ width: `${survey.progress}%` }} />
                </div>
                <span className="text-[11px] text-slate-400">{survey.progress}%</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
