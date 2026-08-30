import { TrendingUp, Target, AlertTriangle, Zap } from 'lucide-react';
import { dashboardStats } from '../../data/mockData';

const iconMap = {
  TrendingUp: TrendingUp,
  Target: Target,
  AlertTriangle: AlertTriangle,
  Zap: Zap,
};

export default function StatCard({ stat }) {
  const Icon = iconMap[stat.icon];

  return (
    <div className="card rounded-2xl p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-300">
            {stat.title}
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-sky-500/10 dark:text-cyan-300">
          <Icon size={24} />
        </div>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-300">{stat.change}</p>
    </div>
  );
}
