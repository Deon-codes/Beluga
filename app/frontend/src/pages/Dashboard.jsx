import { useNavigate } from 'react-router-dom';
import { Eye, Send } from 'lucide-react';
import { dashboardStats } from '../data/mockData';
import StatCard from '../components/dashboard/StatCard';
import IndiaMap from '../components/dashboard/IndiaMap';
import RecentDetections from '../components/dashboard/RecentDetections';
import RecentSurveys from '../components/dashboard/RecentSurveys';
import ThreatGauge from '../components/dashboard/ThreatGauge';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 gap-4 p-4 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
      <aside className="flex flex-col gap-3">
        <div className="glass-panel rounded-xl p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Survey Info</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Active Area</span><span>Indian Ocean</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Vessels</span><span className="text-emerald-400">2 Active</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Coverage</span><span className="text-cyan-300">78.4%</span></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="btn-secondary flex items-center justify-center gap-1 px-2 py-1.5 text-[11px]">
              <Eye size={12} /> Track Vessels
            </button>
            <button onClick={() => navigate('/new-survey')} className="btn-secondary flex items-center justify-center gap-1 px-2 py-1.5 text-[11px]">
              <Send size={12} /> Route Plan
            </button>
          </div>
        </div>
        {dashboardStats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </aside>

      <IndiaMap />

      <aside className="flex flex-col gap-3">
        <ThreatGauge />
        <RecentDetections />
        <RecentSurveys />
      </aside>
    </div>
  );
}
