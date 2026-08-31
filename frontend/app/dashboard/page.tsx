'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardMetrics } from '@/types';
import { getDashboardMetrics } from '@/services/api';
import { BathymetricMap } from '@/components/BathymetricMap';
import { RiskBadge } from '@/components/RiskBadge';
import {
  Waves,
  ShieldAlert,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  TrendingUp,
  Plus,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDashboardMetrics();
      setMetrics(data);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    getDashboardMetrics().then((data) => {
      if (isMounted) {
        setMetrics(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 font-medium">
            Monitor side-scan sonar detection data and seafloor anomalies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            title="Refresh Data"
            className="premium-button-secondary flex items-center justify-center p-2.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/surveys/new"
            className="premium-button flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Survey</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Total Seabed Scanned */}
        <div className="premium-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400 font-semibold text-sm tracking-wide uppercase">
            <Waves className="w-4 h-4 text-primary-500" />
            Seabed Scanned
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {metrics?.totalSeabedScannedKm2?.toLocaleString() || '1,842.6'}
              <span className="text-base font-medium text-slate-500 ml-1">km²</span>
            </div>
            <div className="text-sm text-emerald-600 dark:text-emerald-500 flex items-center gap-1.5 mt-2 font-medium bg-emerald-50 dark:bg-emerald-500/10 w-fit px-2 py-0.5 rounded-md">
              <TrendingUp className="w-3.5 h-3.5" /> +14.8 km²/day
            </div>
          </div>
        </div>

        {/* KPI 2: Confirmed Hazards */}
        <div className="premium-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400 font-semibold text-sm tracking-wide uppercase">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            Total Hazards
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {metrics?.confirmedHazardsTotal || 47}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 text-red-700 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 px-2.5 py-1 rounded-md">
              12 Critical
            </div>
            <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 px-2.5 py-1 rounded-md">
              18 Infra
            </div>
          </div>
        </div>

        {/* KPI 3: Model Confidence */}
        <div className="premium-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400 font-semibold text-sm tracking-wide uppercase">
            <Activity className="w-4 h-4 text-indigo-500" />
            Model Confidence
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {metrics?.modelConfidenceAvg || 89.7}%
            </div>
            <div className="text-sm font-medium text-slate-500 dark:text-zinc-500 mt-2">
              ±{(metrics?.modelConfidenceStd || 0.038).toFixed(3)} std dev
            </div>
          </div>
        </div>

        {/* KPI 4: Hotspots */}
        <div className="premium-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400 font-semibold text-sm tracking-wide uppercase">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Ghost Net Clusters
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {metrics?.ghostNetClusters || 3}
            </div>
          </div>
          <div className="text-xs font-medium text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-zinc-800">
            Outer anchorage trawl snags detected at 64m depth
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Map Viewport */}
        <div className="lg:col-span-2 premium-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Survey Map</h2>
            <Link
              href="/surveys/SURV-2026-NIOT-088"
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium flex items-center gap-1 group"
            >
              View Active Survey <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="border border-slate-200/60 dark:border-zinc-800/80 rounded-xl overflow-hidden bg-slate-50 dark:bg-zinc-900 shadow-inner">
             <BathymetricMap
               surveys={metrics?.recentSurveys || []}
               anomalies={metrics?.recentAnomalies || []}
               className="h-[420px] w-full"
             />
          </div>
        </div>

        {/* Right Anomaly Stream */}
        <div className="premium-card flex flex-col">
          <div className="p-6 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Anomalies</h2>
            <Link
              href="/detections"
              className="text-sm text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium flex items-center gap-1 transition-colors group"
            >
              View all <ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="p-5 flex-1 overflow-y-auto max-h-[460px] space-y-3 relative">
            {(metrics?.recentAnomalies || []).map((anom) => (
              <div
                key={anom.id}
                className="group border border-slate-200/60 dark:border-zinc-800/80 hover:border-primary-300 dark:hover:border-primary-700/50 rounded-xl p-4 transition-all duration-300 space-y-3 bg-white dark:bg-zinc-900/50 hover:shadow-md cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {anom.class_name}
                    </div>
                    <div className="text-xs font-medium text-slate-500 dark:text-zinc-500 mt-1">
                      {anom.id}
                    </div>
                  </div>
                  <RiskBadge level={anom.risk} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-slate-100 dark:border-zinc-800/80 font-medium">
                  <div>
                    Dims: <span className="text-slate-900 dark:text-zinc-200">{anom.dimensions_m.length}m × {anom.dimensions_m.width}m</span>
                  </div>
                  <div>
                    Conf: <span className="text-slate-900 dark:text-zinc-200">{anom.confidence_pct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Fade out bottom gradient */}
            <div className="sticky bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white dark:from-zinc-900 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Bottom Section: Active Surveys */}
      <div className="premium-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-lg">
              <FolderOpen className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Surveys</h2>
          </div>
          <Link href="/surveys" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium flex items-center gap-1 group">
            Browse Archive <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(metrics?.recentSurveys || []).map((srv) => (
            <Link
              key={srv.id}
              href={`/surveys/${srv.id}`}
              className="group border border-slate-200/60 dark:border-zinc-800/80 hover:border-primary-300 dark:hover:border-primary-700/50 rounded-2xl p-5 transition-all duration-300 bg-slate-50/50 dark:bg-zinc-900/30 hover:bg-white dark:hover:bg-zinc-900 hover:shadow-md block"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{srv.id}</span>
                <span className="px-2.5 py-1 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-xs rounded-md font-semibold">
                  {srv.status}
                </span>
              </div>
              
              <div className="text-sm font-medium text-slate-700 dark:text-zinc-300 mb-4 line-clamp-1">
                {srv.title}
              </div>

              <div className="text-xs text-slate-500 dark:text-zinc-400 space-y-1.5 bg-white dark:bg-zinc-950 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/50">
                <div className="flex justify-between">
                  <span>Vessel</span>
                  <span className="font-medium text-slate-700 dark:text-zinc-300">{srv.metadata?.vessel_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Coverage</span>
                  <span className="font-medium text-slate-700 dark:text-zinc-300">{srv.metadata?.swath_range_m || '?'}m Swath</span>
                </div>
                <div className="text-red-600 dark:text-red-400 font-semibold pt-2 mt-2 border-t border-slate-100 dark:border-zinc-800/50 flex justify-between">
                  <span>{srv.total_anomalies} Hazards</span>
                  <span>({srv.critical_count} Critical)</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

