import { dashboardStats } from '../data/mockData';
import StatCard from '../components/dashboard/StatCard';
import IndiaMap from '../components/dashboard/IndiaMap';
import RecentDetections from '../components/dashboard/RecentDetections';
import RecentSurveys from '../components/dashboard/RecentSurveys';

export default function Dashboard() {
  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="overflow-hidden rounded-[28px] border border-sky-100 bg-gradient-to-r from-sky-100 via-white to-cyan-50 p-5 shadow-[0_20px_45px_rgba(14,116,144,0.08)] dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">
              Coastal Intelligence
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Marine Survey Intelligence Overview
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 shadow-sm shadow-emerald-200/40 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Monitoring
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2.3fr)_380px]">
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900">
          <IndiaMap />
        </div>

        <div className="flex flex-col gap-6">
          <div className="h-[290px] overflow-hidden">
            <RecentDetections />
          </div>
          <div className="h-[290px] overflow-hidden">
            <RecentSurveys />
          </div>
        </div>
      </div>
    </div>
  );
}