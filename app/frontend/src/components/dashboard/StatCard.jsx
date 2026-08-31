import { TrendingUp, Target, AlertTriangle, Zap } from 'lucide-react';

const iconMap = {
  TrendingUp,
  Target,
  AlertTriangle,
  Zap,
};

const accentStyles = {
  cyan: 'text-cyan-300 bg-cyan-400/10 shadow-[0_0_16px_rgba(0,210,255,0.25)]',
  red: 'text-red-400 bg-red-500/10 shadow-[0_0_16px_rgba(239,68,68,0.25)]',
  amber: 'text-amber-300 bg-amber-500/10 shadow-[0_0_16px_rgba(245,158,11,0.25)]',
};

export default function StatCard({ stat }) {
  const Icon = iconMap[stat.icon];
  const tone =
    stat.changeTone === 'danger'
      ? 'text-red-400'
      : stat.changeTone === 'positive'
        ? 'text-cyan-300'
        : stat.changeTone === 'live'
          ? 'text-amber-300'
          : 'text-slate-400';

  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{stat.title}</p>
          <p className={`mt-1 text-xs ${tone}`}>{stat.change}</p>
        </div>
        <div className={`rounded-full p-2 ${accentStyles[stat.accent] || accentStyles.cyan}`}>
          {Icon ? <Icon size={18} /> : null}
        </div>
      </div>
    </div>
  );
}
