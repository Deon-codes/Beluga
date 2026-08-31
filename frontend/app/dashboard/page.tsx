'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardMetrics, AnomalyDetection, SurveyRecord } from '@/types';
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
  Radio,
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
    <div className="p-4 space-y-4 max-w-7xl mx-auto font-mono">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e293b] pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-wider text-white uppercase flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            MISSION COMMAND // TACTICAL HYDROGRAPHIC DASHBOARD
          </h1>
          <p className="text-xs text-slate-400">
            Autonomous side-scan sonar waterfall hazard detection & seafloor classification (NIOT-MoES)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Refresh Telemetry"
            className="p-2 bg-[#0b1329] hover:bg-[#111d38] border border-[#1e293b] hover:border-cyan-600 rounded-xs text-xs text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/surveys/new"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#06b6d4] hover:bg-[#22d3ee] text-[#0b1329] font-bold text-xs uppercase tracking-wider rounded-xs transition-colors shadow-md shadow-cyan-950"
          >
            <Plus className="w-4 h-4" />
            <span>INGEST NEW SURVEY</span>
          </Link>
        </div>
      </div>

      {/* KPI Ribbon (Dense 4-Card Command Format) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Total Seabed Scanned */}
        <div className="bg-[#0b1329] border border-[#1e293b] p-3 rounded-xs space-y-2 reticle-box">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 uppercase font-medium">
              <Waves className="w-3.5 h-3.5 text-cyan-400" />
              TOTAL SEABED SCANNED
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +14.8 km²/day
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-xl font-black text-slate-100 font-mono-tabular tracking-tight">
              {metrics?.totalSeabedScannedKm2.toLocaleString() || '1,842.6'}{' '}
              <span className="text-xs font-normal text-cyan-400">km²</span>
            </div>
          </div>

          {/* Scan-rate SVG sparkline */}
          <div className="h-6 w-full pt-1">
            <svg className="w-full h-full overflow-visible">
              <path
                d="M 0,18 L 20,15 L 40,14 L 60,16 L 80,11 L 100,9 L 120,7 L 140,8 L 160,5 L 180,3 L 200,2"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>SURVEY TRANSECT RATE</span>
            <span className="text-cyan-400">98.4% COVERAGE</span>
          </div>
        </div>

        {/* KPI 2: Confirmed Hazards */}
        <div className="bg-[#0b1329] border border-[#1e293b] p-3 rounded-xs space-y-2 reticle-box">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 uppercase font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              CONFIRMED HAZARDS
            </span>
            <span className="text-[10px] px-1.5 py-0.2 bg-red-950 border border-red-800 text-red-400 font-bold rounded-xs">
              ACTIVE
            </span>
          </div>

          <div className="text-xl font-black text-slate-100 font-mono-tabular tracking-tight">
            {metrics?.confirmedHazardsTotal || 47}{' '}
            <span className="text-xs font-normal text-slate-400">TOTAL</span>
          </div>

          <div className="grid grid-cols-3 gap-1 text-center text-[10px] pt-1">
            <div className="bg-red-950/60 border border-red-800/80 p-1 rounded-xs">
              <div className="text-red-400 font-bold">12</div>
              <div className="text-slate-400 text-[9px]">CRITICAL</div>
            </div>
            <div className="bg-amber-950/60 border border-amber-800/80 p-1 rounded-xs">
              <div className="text-amber-400 font-bold">18</div>
              <div className="text-slate-400 text-[9px]">INFRA</div>
            </div>
            <div className="bg-slate-900 border border-slate-700 p-1 rounded-xs">
              <div className="text-emerald-400 font-bold">17</div>
              <div className="text-slate-400 text-[9px]">MINOR</div>
            </div>
          </div>
        </div>

        {/* KPI 3: Model Confidence / Stability */}
        <div className="bg-[#0b1329] border border-[#1e293b] p-3 rounded-xs space-y-2 reticle-box">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 uppercase font-medium">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              MODEL CONFIDENCE / STABILITY
            </span>
            <span className="text-[10px] text-cyan-400">YOLOv8s</span>
          </div>

          <div className="text-xl font-black text-cyan-300 font-mono-tabular tracking-tight">
            {metrics?.modelConfidenceAvg || 89.7}%{' '}
            <span className="text-xs font-normal text-slate-400">
              ±{(metrics?.modelConfidenceStd || 0.038).toFixed(3)}σ
            </span>
          </div>

          <div className="w-full bg-slate-900 h-2 border border-slate-800 rounded-xs overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full w-[89.7%]" />
          </div>

          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>MC-DROPOUT 10-PASS</span>
            <span className="text-slate-300">HIGH STABILITY</span>
          </div>
        </div>

        {/* KPI 4: Ghost Net / Snag Hotspots */}
        <div className="bg-[#0b1329] border border-[#1e293b] p-3 rounded-xs space-y-2 reticle-box">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 uppercase font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              GHOST NET / SNAG HOTSPOTS
            </span>
            <span className="text-[10px] px-1.5 py-0.2 bg-amber-950 border border-amber-800 text-amber-400 font-bold rounded-xs animate-pulse">
              WARNING
            </span>
          </div>

          <div className="text-xl font-black text-amber-300 font-mono-tabular tracking-tight">
            {metrics?.ghostNetClusters || 3}{' '}
            <span className="text-xs font-normal text-slate-400">CLUSTERS</span>
          </div>

          <div className="text-[11px] text-slate-300 bg-[#070e20] p-1.5 rounded-xs border border-slate-800/80">
            Outer anchorage trawl snags detected at 64m depth
          </div>

          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>DIVER RECOVERY: 4 QUEUED</span>
            <span className="text-amber-400">SECTOR 04</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Bathymetric Map (Left ~70%) + Recent Anomaly Stream (Right ~30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Map Viewport */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span>GEOSPATIAL BATHYMETRIC TRACKER</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-cyan-950 border border-cyan-800 text-cyan-400 rounded-xs">
                WGS84 LIVE
              </span>
            </div>
            <Link
              href="/surveys/SURV-2026-NIOT-088"
              className="text-xs text-cyan-400 hover:text-cyan-200 flex items-center gap-1 font-semibold hover:underline"
            >
              OPEN EVALUATOR WORKSTATION <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <BathymetricMap
            surveys={metrics?.recentSurveys || []}
            anomalies={metrics?.recentAnomalies || []}
            className="h-[480px] w-full"
          />
        </div>

        {/* Right Anomaly Stream */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              RECENT ANOMALY STREAM
            </span>
            <Link
              href="/detections"
              className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1"
            >
              VIEW ALL (47) <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-[#0b1329] border border-[#1e293b] rounded-xs p-2 flex-1 overflow-y-auto max-h-[480px] space-y-2">
            {(metrics?.recentAnomalies || []).map((anom) => (
              <div
                key={anom.id}
                className="bg-[#070e20] hover:bg-[#111d38] border border-slate-800/80 hover:border-cyan-500/80 p-2.5 rounded-xs transition-all space-y-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-100 truncate group-hover:text-cyan-300">
                      {anom.class_name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono-tabular">
                      ID: {anom.id} | SURVEY: {anom.survey_id || 'SURV-2026-NIOT-088'}
                    </div>
                  </div>
                  <RiskBadge level={anom.risk} size="sm" />
                </div>

                {/* Dimensions + Confidence stats */}
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 bg-[#040814] p-1.5 rounded-xs border border-slate-800/50">
                  <div>
                    <span className="text-slate-500">DIM: </span>
                    <span className="font-mono-tabular">
                      {anom.dimensions_m.length}m × {anom.dimensions_m.width}m
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500">CONF: </span>
                    <span className="text-cyan-300 font-bold font-mono-tabular">
                      {anom.confidence_pct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                  <span className="text-slate-400 font-mono-tabular">
                    {(anom.location.lat ?? 13.0827).toFixed(4)}°N, {(anom.location.lon ?? 80.3128).toFixed(4)}°E
                  </span>
                  <Link
                    href={`/surveys/${anom.survey_id || 'SURV-2026-NIOT-088'}`}
                    className="text-cyan-400 hover:text-cyan-200 font-bold flex items-center gap-0.5 group-hover:underline"
                  >
                    INSPECT <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Active Survey Transacts */}
      <div className="bg-[#0b1329] border border-[#1e293b] p-3 rounded-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              ACTIVE SURVEY TRANSECTS & MISSION RECORDS
            </span>
          </div>
          <Link href="/surveys" className="text-xs text-cyan-400 hover:underline">
            EXPLORE ARCHIVE →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(metrics?.recentSurveys || []).map((srv) => (
            <Link
              key={srv.id}
              href={`/surveys/${srv.id}`}
              className="bg-[#070e20] hover:bg-[#111d38] border border-slate-800 hover:border-cyan-500 p-3 rounded-xs transition-all space-y-2 block"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-300">{srv.id}</span>
                <span className="px-1.5 py-0.5 bg-cyan-950 border border-cyan-800 text-cyan-400 text-[10px] rounded-xs font-bold">
                  {srv.status}
                </span>
              </div>

              <div className="text-xs font-medium text-slate-200 line-clamp-1">
                {srv.title}
              </div>

              <div className="text-[10px] text-slate-400 space-y-0.5">
                <div>VESSEL: <strong className="text-slate-300">{srv.metadata.vessel_name}</strong></div>
                <div>COVERAGE: <strong className="text-slate-300">{srv.metadata.swath_range_m}m SWATH ({srv.metadata.resolution_m_px}m/px)</strong></div>
                <div className="text-red-400 font-bold">
                  {srv.total_anomalies} HAZARDS DETECTED ({srv.critical_count} CRITICAL)
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
