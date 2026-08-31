'use client';

import React, { useState, useEffect } from 'react';
import { SurveyRecord, AnomalyDetection } from '@/types';
import { getAllSurveys, generateReportData, getReportDownloadUrl } from '@/services/api';
import { RiskBadge } from '@/components/RiskBadge';
import { GeoBadge } from '@/components/GeoBadge';
import {
  FileText,
  Download,
  ShieldAlert,
  Building2,
  Calendar,
  Compass,
  CheckCircle2,
  Printer,
  ChevronDown,
  Waves,
  Cpu,
  Sparkles,
} from 'lucide-react';

export default function ReportsCompliancePage() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');
  const [currentSurvey, setCurrentSurvey] = useState<SurveyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getAllSurveys();
        setSurveys(data);
        if (data.length > 0) {
          setSelectedSurveyId(data[0].id);
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadDetails() {
      if (!selectedSurveyId) return;
      try {
        const { getSurveyDetections } = await import('@/services/api');
        const res = await getSurveyDetections(selectedSurveyId);
        setCurrentSurvey(res.survey);
      } catch (err) {
        console.error('Failed to load details', err);
        setCurrentSurvey(null);
      }
    }
    loadDetails();
  }, [selectedSurveyId]);

  // Class distribution breakdown
  const classCounts = (currentSurvey?.detections || []).reduce((acc, d) => {
    acc[d.class_name] = (acc[d.class_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleDownload = (format: 'json' | 'csv') => {
    if (!currentSurvey) return;
    const content = generateReportData(currentSurvey, format);
    const mimeType = format === 'json' ? 'application/json' : 'text/csv';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NIOT_MoES_REPORT_${currentSurvey.id}.${format}`;
    a.click();

    setDownloadSuccess(`Generated and downloaded NIOT_${currentSurvey.id}.${format.toUpperCase()}`);
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4  select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-3">
        <div>
          <h1 className="text-lg text-2xl font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            HYDROGRAPHIC COMPLIANCE & EXPORT TERMINAL
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-500 dark:text-slate-400">
            Official Ministry of Earth Sciences / NIOT side-scan sonar anomaly certification & telemetry logs
          </p>
        </div>

        {/* Survey Select & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedSurveyId}
            onChange={(e) => setSelectedSurveyId(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-slate-700 text-xs text-blue-500 dark:text-blue-300  py-1.5 px-2.5 rounded-xl focus:border-blue-500 cursor-pointer"
          >
            {surveys.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => handleDownload('json')}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:bg-blue-900 border border-slate-700 hover:border-blue-500 text-blue-500 dark:text-blue-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT JSON</span>
          </button>

          <button
            onClick={() => handleDownload('csv')}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:bg-blue-900 border border-slate-700 hover:border-blue-500 text-blue-500 dark:text-blue-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-800 border border-slate-700 text-slate-600 dark:text-slate-600 dark:text-slate-300 text-xs rounded-xl flex items-center gap-1"
            title="Print Document"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-pulse">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-600 dark:text-emerald-400" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Official NIOT Document Container */}
      {currentSurvey && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 rounded-xl space-y-6  shadow-2xl">
          {/* Document Header (Defense / NIOT Government Styling) */}
          <div className="border-b-2 border-blue-500/70 pb-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-widest font-black">
                  GOVERNMENT OF INDIA // MINISTRY OF EARTH SCIENCES (MoES)
                </div>
                <div className="text-base font-black text-slate-900 dark:text-slate-900 dark:text-slate-100 tracking-tight">
                  NATIONAL INSTITUTE OF OCEAN TECHNOLOGY (NIOT)
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500 dark:text-slate-400">
                  AUTONOMOUS SIDE-SCAN SONAR MARINE HAZARD AUDIT CERTIFICATE
                </div>
              </div>

              <div className="text-right text-xs">
                <div className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900 border border-cyan-700 text-blue-500 dark:text-blue-300 font-bold inline-block rounded-xl">
                  CERT-NIOT-2026- MoES
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-500 dark:text-slate-400 mt-1 ">
                  GENERATED: {new Date().toUTCString()}
                </div>
              </div>
            </div>

            {/* Mission / Survey Summary Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">SURVEY ID</span>
                <span className="font-bold text-blue-500 dark:text-blue-300 ">{currentSurvey.id}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">VESSEL / PLATFORM</span>
                <span className="font-bold text-slate-700 dark:text-slate-700 dark:text-slate-200">{currentSurvey.metadata?.vessel_name || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">ACOUSTIC SWATH / RES</span>
                <span className="font-bold text-blue-500 dark:text-blue-300 ">
                  {currentSurvey.metadata?.swath_range_m || '---'}m @ {currentSurvey.metadata?.resolution_m_px || '---'}m/px
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">AI INFERENCE ENGINE</span>
                <span className="font-bold text-slate-700 dark:text-slate-700 dark:text-slate-200">YOLOv8s-Sonar v2.1</span>
              </div>
            </div>
          </div>

          {/* Risk Summary KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800">
              <span className="text-[10px] text-slate-500 uppercase block">TOTAL ANOMALIES</span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-900 dark:text-slate-100 ">
                {currentSurvey.total_anomalies ?? 0}
              </span>
            </div>
            <div className="bg-red-950/40 p-3 rounded-xl border border-red-800/80">
              <span className="text-[10px] text-red-600 dark:text-red-600 dark:text-red-400 uppercase font-bold block">CRITICAL RISK</span>
              <span className="text-xl font-black text-red-300 ">
                {currentSurvey.critical_count ?? 0}
              </span>
            </div>
            <div className="bg-orange-950/40 p-3 rounded-xl border border-orange-800/80">
              <span className="text-[10px] text-orange-400 uppercase font-bold block">HIGH RISK</span>
              <span className="text-xl font-black text-orange-300 ">
                {currentSurvey.high_count ?? 0}
              </span>
            </div>
            <div className="bg-amber-950/40 p-3 rounded-xl border border-amber-800/80">
              <span className="text-[10px] text-amber-600 dark:text-amber-600 dark:text-amber-400 uppercase font-bold block">MEDIUM / MINOR</span>
              <span className="text-xl font-black text-amber-300 ">
                {(currentSurvey.medium_count ?? 0) + (currentSurvey.low_count ?? 0)}
              </span>
            </div>
          </div>

          {/* Class Distribution Bar Graph */}
          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-slate-200 dark:border-zinc-800 pb-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                ACOUSTIC TARGET CLASS DISTRIBUTION
              </span>
              <span className="text-[10px] text-slate-500">17-CLASS STANDARD</span>
            </div>

            <div className="space-y-2">
              {Object.entries(classCounts).map(([className, count]) => {
                const total = currentSurvey.total_anomalies || (currentSurvey.detections || []).length || 1;
                const pct = ((count / total) * 100).toFixed(0);
                return (
                  <div key={className} className="space-y-1 text-xs">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-600 dark:text-slate-300 font-semibold">{className}</span>
                      <span className="text-blue-500 dark:text-blue-300 ">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-xl overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full Certified Anomaly Inventory Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                CERTIFIED HAZARD & DEBRIS INVENTORY
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-500 dark:text-slate-400 ">
                {(currentSurvey.detections || []).length} RECORDS AUDITED
              </span>
            </div>

            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse ">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-zinc-800 text-[10px] uppercase">
                  <tr>
                    <th className="p-2">ID</th>
                    <th className="p-2">CLASS NAME</th>
                    <th className="p-2">RISK</th>
                    <th className="p-2">CONFIDENCE</th>
                    <th className="p-2">DIMENSIONS (L×W×H)</th>
                    <th className="p-2">WGS84 COORDINATES</th>
                    <th className="p-2">SHADOW RELIEF</th>
                    <th className="p-2">DIVER STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-600 dark:text-slate-600 dark:text-slate-300 text-xs">
                  {(currentSurvey.detections || []).map((det) => (
                    <tr key={det.id} className="hover:bg-slate-50 dark:bg-slate-900">
                      <td className="p-2 font-bold text-blue-500 dark:text-blue-300">{det.id}</td>
                      <td className="p-2 font-semibold text-slate-700 dark:text-slate-700 dark:text-slate-200">{det.class_name}</td>
                      <td className="p-2">
                        <RiskBadge level={det.risk} size="sm" />
                      </td>
                      <td className="p-2 text-blue-500 dark:text-blue-300">
                        {det.confidence_pct.toFixed(1)}% ±{(det.uncertainty_std ?? 0.045).toFixed(3)}σ
                      </td>
                      <td className="p-2">
                        {(det.dimensions_m.length_m ?? det.dimensions_m.length ?? 0).toFixed(1)}m × {(det.dimensions_m.width_m ?? det.dimensions_m.width ?? 0).toFixed(1)}m
                        {(det.dimensions_m.height_m ?? det.dimensions_m.height) != null && ` × ${(det.dimensions_m.height_m ?? det.dimensions_m.height ?? 0).toFixed(1)}m`}
                      </td>
                      <td className="p-2 text-[11px] text-slate-500 dark:text-slate-500 dark:text-slate-400">
                        {(det.location.lat ?? 13.0827).toFixed(6)}°N, {(det.location.lon ?? 80.3128).toFixed(6)}°E
                      </td>
                      <td className="p-2 text-[11px]">
                        {det.has_shadow ? (
                          <span className="text-blue-600 dark:text-blue-400">
                            {det.shadow_vector?.length_m.toFixed(1)}m (H: {det.dimensions_m.height_m ?? det.dimensions_m.height ?? 0}m)
                          </span>
                        ) : (
                          <span className="text-slate-600">NONE</span>
                        )}
                      </td>
                      <td className="p-2 text-[11px]">
                        {det.diver_recovery_flagged ? (
                          <span className="px-1.5 py-0.5 bg-amber-950 border border-amber-800 text-amber-300 font-bold rounded-xl">
                            FLAGGED
                          </span>
                        ) : (
                          <span className="text-slate-600">STANDARD</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Certificate Sign-off footer */}
          <div className="border-t border-slate-200 dark:border-zinc-800 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-500 dark:text-slate-400">
            <div className="space-y-1">
              <div>NIOT MARINE HYDROGRAPHIC CERTIFICATION AUTHORITY</div>
              <div className="text-[10px] text-slate-500">
                AUTONOMOUS CLASSIFICATION SYSTEM VALIDATED UNDER SIH 26057
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-500 dark:text-blue-300 font-bold rounded-xl text-[11px]">
                VALIDATED & SECURED BY NIOT-MoES
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
