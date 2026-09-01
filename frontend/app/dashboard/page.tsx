'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { DashboardMetrics } from '@/types';
import {
  getDashboardMetrics,
  downloadSurveyReport,
  downloadAllDetectionsReport,
  downloadMarkdownReport,
  downloadLatexReport,
} from '@/services/api';
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
  Download,
  FileText,
  CheckCircle2,
  ChevronDown,
  Code2,
  FileDown,
} from 'lucide-react';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

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

  // Close export dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownloadLatest = async (format: 'json' | 'csv') => {
    const surveyId = metrics?.recentSurveys?.[0]?.id || 'SURV-2026-NIOT-088';
    setExportMenuOpen(false);
    setDownloadMsg(`Preparing ${format.toUpperCase()} report for ${surveyId}...`);
    const success = await downloadSurveyReport(surveyId, format);
    if (success) {
      setDownloadMsg(`Successfully downloaded NIOT_${surveyId}.${format.toUpperCase()}`);
    } else {
      setDownloadMsg(`Failed to download report for ${surveyId}`);
    }
    setTimeout(() => setDownloadMsg(null), 3500);
  };

  const handleDownloadLatexLatest = async () => {
    const surveyId = metrics?.recentSurveys?.[0]?.id || 'SURV-2026-NIOT-088';
    setExportMenuOpen(false);
    setDownloadMsg(`Generating LaTeX (.tex) report for ${surveyId}...`);
    const success = await downloadLatexReport(surveyId);
    if (success) {
      setDownloadMsg(`Downloaded NIOT_MoES_REPORT_${surveyId}.tex`);
    } else {
      setDownloadMsg(`Failed to download LaTeX report`);
    }
    setTimeout(() => setDownloadMsg(null), 3500);
  };

  const handleDownloadMarkdownLatest = async () => {
    const surveyId = metrics?.recentSurveys?.[0]?.id || 'SURV-2026-NIOT-088';
    setExportMenuOpen(false);
    setDownloadMsg(`Generating Markdown (.md) report for ${surveyId}...`);
    const success = await downloadMarkdownReport(surveyId);
    if (success) {
      setDownloadMsg(`Downloaded NIOT_MoES_REPORT_${surveyId}.md`);
    } else {
      setDownloadMsg(`Failed to download Markdown report`);
    }
    setTimeout(() => setDownloadMsg(null), 3500);
  };

  const handleDownloadAll = async () => {
    setExportMenuOpen(false);
    setDownloadMsg('Exporting hydrographic master dataset (CSV)...');
    const success = await downloadAllDetectionsReport('csv');
    if (success) {
      setDownloadMsg('Successfully exported Master Detections CSV');
    } else {
      setDownloadMsg('Failed to export master catalog');
    }
    setTimeout(() => setDownloadMsg(null), 3500);
  };

  const handleDownloadSingleSurvey = async (e: React.MouseEvent, surveyId: string, format: 'json' | 'csv') => {
    e.preventDefault();
    e.stopPropagation();
    setDownloadMsg(`Exporting ${format.toUpperCase()} for ${surveyId}...`);
    const success = await downloadSurveyReport(surveyId, format);
    if (success) {
      setDownloadMsg(`Downloaded report_${surveyId}.${format}`);
    } else {
      setDownloadMsg(`Failed to export report for ${surveyId}`);
    }
    setTimeout(() => setDownloadMsg(null), 3500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Download Alert Toast */}
      {downloadMsg && (
        <div className="p-3.5 bg-blue-950/80 border border-blue-500/50 text-blue-200 text-xs font-semibold rounded-xl flex items-center justify-between shadow-lg shadow-blue-950/40 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{downloadMsg}</span>
          </div>
          <button
            onClick={() => setDownloadMsg(null)}
            className="text-blue-400 hover:text-white text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

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

          {/* Export Report Dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="premium-button-secondary flex items-center gap-2 text-sm font-semibold px-3 py-2"
              title="Download Survey Reports"
            >
              <Download className="w-4 h-4 text-primary-500" />
              <span>Export Report</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800/80">
                  Hydrographic & Human Review Reports
                </div>

                <button
                  onClick={handleDownloadLatexLatest}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 rounded-xl transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-500" />
                    <span>Download LaTeX (.tex) Report</span>
                  </div>
                  <span className="text-[10px] text-indigo-500 uppercase font-mono font-bold">.tex</span>
                </button>

                <button
                  onClick={handleDownloadMarkdownLatest}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 rounded-xl transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <FileDown className="w-4 h-4 text-emerald-500" />
                    <span>Download Markdown (.md) Report</span>
                  </div>
                  <span className="text-[10px] text-emerald-500 uppercase font-mono font-bold">.md</span>
                </button>

                <button
                  onClick={() => handleDownloadLatest('csv')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 rounded-xl transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-cyan-500" />
                    <span>Download Active Survey (CSV)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">.csv</span>
                </button>

                <button
                  onClick={() => handleDownloadLatest('json')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 rounded-xl transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>Download Active Survey (JSON)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">.json</span>
                </button>

                <button
                  onClick={handleDownloadAll}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 rounded-xl transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-amber-500" />
                    <span>Master Catalog Inventory (CSV)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">.csv</span>
                </button>

                <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-1 mt-1">
                  <Link
                    href="/reports"
                    onClick={() => setExportMenuOpen(false)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-xl transition-colors"
                  >
                    <span>Open Human Review Terminal</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

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
            {metrics?.recentAnomalies && metrics.recentAnomalies.length > 0 ? (
              metrics.recentAnomalies.map((anom) => (
                <Link
                  key={anom.id}
                  href={anom.survey_id ? `/surveys/${anom.survey_id}` : '/detections'}
                  className="block group border border-slate-200/60 dark:border-zinc-800/80 hover:border-primary-300 dark:hover:border-primary-700/50 rounded-xl p-4 transition-all duration-300 space-y-3 bg-white dark:bg-zinc-900/50 hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {anom.class_name}
                      </div>
                      <div className="text-xs font-medium text-slate-500 dark:text-zinc-500 mt-1">
                        {anom.id} {anom.survey_id ? `• ${anom.survey_id}` : ''}
                      </div>
                    </div>
                    <RiskBadge level={anom.risk} size="sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-slate-100 dark:border-zinc-800/80 font-medium">
                    <div>
                      Dims: <span className="text-slate-900 dark:text-zinc-200">{(anom.dimensions_m?.length ?? 1.5)}m × {(anom.dimensions_m?.width ?? 1.0)}m</span>
                    </div>
                    <div>
                      Conf: <span className="text-slate-900 dark:text-zinc-200">{(anom.confidence_pct || 85).toFixed(1)}%</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-slate-400 dark:text-zinc-500">
                No recent anomalies detected yet. Upload a survey to start scanning.
              </div>
            )}
            
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
            <div
              key={srv.id}
              className="group border border-slate-200/60 dark:border-zinc-800/80 hover:border-primary-300 dark:hover:border-primary-700/50 rounded-2xl p-5 transition-all duration-300 bg-slate-50/50 dark:bg-zinc-900/30 hover:bg-white dark:hover:bg-zinc-900 hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Link
                    href={`/surveys/${srv.id}`}
                    className="font-bold text-sm text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {srv.id}
                  </Link>
                  <span className="px-2.5 py-1 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-xs rounded-md font-semibold">
                    {srv.status}
                  </span>
                </div>
                
                <Link
                  href={`/surveys/${srv.id}`}
                  className="text-sm font-medium text-slate-700 dark:text-zinc-300 mb-4 line-clamp-1 block hover:text-primary-600"
                >
                  {srv.title}
                </Link>

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
              </div>

              {/* Quick Actions Strip */}
              <div className="flex items-center justify-between gap-2 pt-4 mt-2 border-t border-slate-100 dark:border-zinc-800/60 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => handleDownloadSingleSurvey(e, srv.id, 'csv')}
                    className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                    title={`Download ${srv.id} CSV Report`}
                  >
                    <Download className="w-3 h-3" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={(e) => handleDownloadSingleSurvey(e, srv.id, 'json')}
                    className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                    title={`Download ${srv.id} JSON Report`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>JSON</span>
                  </button>
                </div>

                <Link
                  href={`/surveys/${srv.id}`}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold flex items-center gap-0.5 group/link"
                >
                  <span>Inspect</span>
                  <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

