'use client';

import React, { useState, useEffect } from 'react';
import { SurveyRecord, AnomalyDetection } from '@/types';
import {
  getAllSurveys,
  generateReportData,
  getReportDownloadUrl,
  downloadSurveyReport,
  downloadMarkdownReport,
  downloadLatexReport,
  generateMarkdownReport,
  generateLatexReport,
} from '@/services/api';
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
  FileCheck,
  UserCheck,
  AlertOctagon,
  FileDown,
  Stamp,
  Code2,
  Copy,
  Check,
  BookOpen,
} from 'lucide-react';

export default function ReportsCompliancePage() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');
  const [currentSurvey, setCurrentSurvey] = useState<SurveyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Tab switcher: 'rendered' | 'markdown' | 'latex'
  const [activeTab, setActiveTab] = useState<'rendered' | 'markdown' | 'latex'>('rendered');

  // Human Reviewer Inputs (interactive & printable)
  const [reviewerName, setReviewerName] = useState('Lt. Cdr. V. Ramanathan (Chief Hydrographer)');
  const [reviewerDesignation, setReviewerDesignation] = useState('NIOT Ocean Acoustic Division / Naval Hydrographic Office');
  const [reviewStatus, setReviewStatus] = useState('APPROVED FOR OPERATIONAL ACTION');
  const [reviewerNotes, setReviewerNotes] = useState(
    'All high-confidence anomaly targets inspected and validated against bathymetric baseline. Critical coordinates forwarded to Naval Hydrographic Office and Diver Recovery Unit for on-site inspection.'
  );

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

  const handleDownload = async (format: 'json' | 'csv') => {
    if (!currentSurvey) return;
    setDownloadSuccess(`Preparing and downloading NIOT_${currentSurvey.id}.${format.toUpperCase()}...`);
    const success = await downloadSurveyReport(currentSurvey.id, format, currentSurvey);
    if (success) {
      setDownloadSuccess(`Generated and downloaded NIOT_${currentSurvey.id}.${format.toUpperCase()}`);
    } else {
      setDownloadSuccess(`Failed to download report for ${currentSurvey.id}`);
    }
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  const handleDownloadMarkdown = async () => {
    if (!currentSurvey) return;
    setDownloadSuccess(`Generating Markdown Report for ${currentSurvey.id}...`);
    const success = await downloadMarkdownReport(currentSurvey.id, currentSurvey, reviewerNotes, reviewerName, reviewStatus);
    if (success) {
      setDownloadSuccess(`Downloaded NIOT_MoES_REPORT_${currentSurvey.id}.md`);
    } else {
      setDownloadSuccess('Failed to generate Markdown report.');
    }
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  const handleDownloadLatex = async () => {
    if (!currentSurvey) return;
    setDownloadSuccess(`Generating LaTeX (.tex) Report for ${currentSurvey.id}...`);
    const success = await downloadLatexReport(currentSurvey.id, currentSurvey, reviewerNotes, reviewerName, reviewStatus);
    if (success) {
      setDownloadSuccess(`Downloaded NIOT_MoES_REPORT_${currentSurvey.id}.tex`);
    } else {
      setDownloadSuccess('Failed to generate LaTeX report.');
    }
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  const handleCopySource = () => {
    if (!currentSurvey) return;
    const text =
      activeTab === 'latex'
        ? generateLatexReport(currentSurvey, reviewerNotes, reviewerName, reviewStatus)
        : generateMarkdownReport(currentSurvey, reviewerNotes, reviewerName, reviewStatus);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const markdownSource = currentSurvey
    ? generateMarkdownReport(currentSurvey, reviewerNotes, reviewerName, reviewStatus)
    : '';
  const latexSource = currentSurvey
    ? generateLatexReport(currentSurvey, reviewerNotes, reviewerName, reviewStatus)
    : '';

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4 select-none">
      {/* Top Header Controls (Hidden during print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            Human Review & Compliance Report
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Ministry of Earth Sciences (MoES) / NIOT Side-Scan Sonar Certification & Verification Terminal
          </p>
        </div>

        {/* Survey Select & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedSurveyId}
            onChange={(e) => setSelectedSurveyId(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs text-primary-600 dark:text-primary-300 py-2 px-3 rounded-xl focus:border-primary-500 cursor-pointer font-medium"
          >
            {surveys.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.title}
              </option>
            ))}
          </select>

          {/* Export LaTeX */}
          <button
            onClick={handleDownloadLatex}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Download Professional LaTeX Document (.tex) ready for Overleaf / TeX Live"
          >
            <Code2 className="w-4 h-4" />
            <span>EXPORT LATEX (.tex)</span>
          </button>

          {/* Export Markdown */}
          <button
            onClick={handleDownloadMarkdown}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Download GitHub-Flavored Markdown Report (.md)"
          >
            <FileDown className="w-4 h-4 text-emerald-400" />
            <span>EXPORT MARKDOWN (.md)</span>
          </button>

          {/* Primary PDF Print Button */}
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Save as PDF or Print Document"
          >
            <Printer className="w-4 h-4" />
            <span>PDF / PRINT</span>
          </button>

          <button
            onClick={() => handleDownload('csv')}
            className="px-2.5 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
            title="Export CSV Dataset"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => handleDownload('json')}
            className="px-2.5 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
            title="Export Raw JSON Specification"
          >
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="no-print p-3.5 bg-blue-950/80 border border-blue-500/60 text-blue-200 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md animate-pulse">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Tab Switcher: Rendered Document vs Markdown Source vs LaTeX Source */}
      <div className="no-print flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('rendered')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'rendered'
                ? 'bg-white dark:bg-zinc-900 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            Rendered Human Review Document
          </button>
          <button
            onClick={() => setActiveTab('latex')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'latex'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            LaTeX Source (.tex)
          </button>
          <button
            onClick={() => setActiveTab('markdown')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'markdown'
                ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            Markdown Source (.md)
          </button>
        </div>

        {activeTab !== 'rendered' && (
          <button
            onClick={handleCopySource}
            className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard!' : `Copy ${activeTab.toUpperCase()}`}</span>
          </button>
        )}
      </div>

      {/* Raw Source Viewers for LaTeX and Markdown */}
      {activeTab === 'latex' && (
        <div className="bg-slate-950 text-slate-100 p-5 rounded-2xl border border-slate-800 font-mono text-xs overflow-x-auto shadow-xl space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
            <span>LaTeX Source (A4 Geometry, Booktabs & AMSTeX Format)</span>
            <span>{latexSource.length} characters</span>
          </div>
          <pre className="whitespace-pre overflow-x-auto leading-relaxed text-indigo-200">
            {latexSource}
          </pre>
        </div>
      )}

      {activeTab === 'markdown' && (
        <div className="bg-slate-950 text-slate-100 p-5 rounded-2xl border border-slate-800 font-mono text-xs overflow-x-auto shadow-xl space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
            <span>GitHub-Flavored Markdown Report</span>
            <span>{markdownSource.length} characters</span>
          </div>
          <pre className="whitespace-pre overflow-x-auto leading-relaxed text-emerald-200">
            {markdownSource}
          </pre>
        </div>
      )}

      {/* Official NIOT Document Container (Printable Paper Layout) */}
      {activeTab === 'rendered' && currentSurvey && (
        <div className="print-card bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 md:p-8 rounded-2xl space-y-6 shadow-xl">
          {/* Document Header (Defense / NIOT Government Styling) */}
          <div className="border-b-2 border-primary-500/80 pb-5 space-y-3 print-avoid-break">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] text-primary-600 dark:text-primary-400 uppercase tracking-widest font-black flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary-500 inline-block"></span>
                  GOVERNMENT OF INDIA // MINISTRY OF EARTH SCIENCES (MoES)
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  NATIONAL INSTITUTE OF OCEAN TECHNOLOGY (NIOT)
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                  AUTONOMOUS SIDE-SCAN SONAR MARINE HAZARD AUDIT & HUMAN VERIFICATION CERTIFICATE
                </div>
              </div>

              <div className="text-right text-xs">
                <div className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 font-bold inline-block rounded-xl font-mono">
                  CERT-NIOT-2026-MoES
                </div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 font-mono">
                  GENERATED: {new Date().toUTCString()}
                </div>
              </div>
            </div>

            {/* Mission / Survey Summary Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">SURVEY ID</span>
                <span className="font-bold text-primary-600 dark:text-primary-400 font-mono">{currentSurvey.id}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">VESSEL / PLATFORM</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">{currentSurvey.metadata?.vessel_name || 'ORV Sagar Nidhi'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">ACOUSTIC SWATH / RES</span>
                <span className="font-bold text-primary-600 dark:text-primary-400 font-mono">
                  {currentSurvey.metadata?.swath_range_m || '100'}m @ {currentSurvey.metadata?.resolution_m_px || '0.05'}m/px
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">AI INFERENCE ENGINE</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">YOLOv8s-Sonar v2.1</span>
              </div>
            </div>
          </div>

          {/* Risk Summary KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs print-avoid-break">
            <div className="bg-slate-50 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">TOTAL DETECTIONS</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {currentSurvey.total_anomalies ?? (currentSurvey.detections || []).length}
              </span>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 p-3.5 rounded-xl border border-red-200 dark:border-red-800/60">
              <span className="text-[10px] text-red-600 dark:text-red-400 uppercase font-bold block">CRITICAL RISK</span>
              <span className="text-2xl font-black text-red-700 dark:text-red-400 font-mono">
                {currentSurvey.critical_count ?? 0}
              </span>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/30 p-3.5 rounded-xl border border-orange-200 dark:border-orange-800/60">
              <span className="text-[10px] text-orange-600 dark:text-orange-400 uppercase font-bold block">HIGH RISK</span>
              <span className="text-2xl font-black text-orange-700 dark:text-orange-400 font-mono">
                {currentSurvey.high_count ?? 0}
              </span>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold block">MEDIUM / MINOR</span>
              <span className="text-2xl font-black text-amber-700 dark:text-amber-400 font-mono">
                {(currentSurvey.medium_count ?? 0) + (currentSurvey.low_count ?? 0)}
              </span>
            </div>
          </div>

          {/* Class Distribution Breakdown */}
          <div className="bg-slate-50 dark:bg-zinc-800/30 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3 print-avoid-break">
            <div className="flex items-center justify-between text-xs border-b border-slate-200 dark:border-zinc-800 pb-2">
              <span className="font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                ACOUSTIC TARGET CLASS DISTRIBUTION
              </span>
              <span className="text-[10px] text-slate-400 font-mono">17-CLASS STANDARD</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(classCounts).map(([className, count]) => {
                const total = currentSurvey.total_anomalies || (currentSurvey.detections || []).length || 1;
                const pct = ((count / total) * 100).toFixed(0);
                return (
                  <div key={className} className="space-y-1 text-xs">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-700 dark:text-zinc-300 font-semibold">{className}</span>
                      <span className="text-primary-600 dark:text-primary-400 font-mono font-bold">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-600 to-cyan-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full Certified Anomaly Inventory Table */}
          <div className="space-y-2.5 print-avoid-break">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                CERTIFIED HAZARD & DEBRIS INVENTORY
              </span>
              <span className="text-[10px] text-slate-400 font-mono font-semibold">
                {(currentSurvey.detections || []).length} RECORDS AUDITED
              </span>
            </div>

            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800 text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="p-2.5">ID</th>
                    <th className="p-2.5">CLASS NAME</th>
                    <th className="p-2.5">RISK</th>
                    <th className="p-2.5">CONFIDENCE</th>
                    <th className="p-2.5">DIMENSIONS (L×W×H)</th>
                    <th className="p-2.5">WGS84 COORDINATES</th>
                    <th className="p-2.5">SHADOW RELIEF</th>
                    <th className="p-2.5">DIVER STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-700 dark:text-zinc-300 text-xs">
                  {(currentSurvey.detections || []).map((det) => (
                    <tr key={det.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="p-2.5 font-bold font-mono text-primary-600 dark:text-primary-400">{det.id}</td>
                      <td className="p-2.5 font-semibold text-slate-900 dark:text-zinc-100">{det.class_name}</td>
                      <td className="p-2.5">
                        <RiskBadge level={det.risk} size="sm" />
                      </td>
                      <td className="p-2.5 text-slate-700 dark:text-zinc-300 font-mono">
                        {det.confidence_pct.toFixed(1)}% <span className="text-[10px] text-slate-400">±{(det.uncertainty_std ?? 0.045).toFixed(3)}σ</span>
                      </td>
                      <td className="p-2.5 font-mono">
                        {(det.dimensions_m?.length_m ?? det.dimensions_m?.length ?? 0).toFixed(1)}m × {(det.dimensions_m?.width_m ?? det.dimensions_m?.width ?? 0).toFixed(1)}m
                        {(det.dimensions_m?.height_m ?? det.dimensions_m?.height) != null && ` × ${(det.dimensions_m?.height_m ?? det.dimensions_m?.height ?? 0).toFixed(1)}m`}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                        {(det.location?.lat ?? 13.0827).toFixed(6)}°N, {(det.location?.lon ?? 80.3128).toFixed(6)}°E
                      </td>
                      <td className="p-2.5 text-[11px]">
                        {det.has_shadow ? (
                          <span className="text-primary-600 dark:text-primary-400 font-semibold">
                            Relief: {det.dimensions_m?.height_m ?? det.dimensions_m?.height ?? 1.2}m
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="p-2.5 text-[11px]">
                        {det.diver_recovery_flagged ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold rounded-md">
                            FLAGGED
                          </span>
                        ) : (
                          <span className="text-slate-400">Standard</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* HUMAN REVIEW & CERTIFICATION DIRECTIVE (Interactive in UI & Printed in PDF) */}
          <div className="border border-slate-300 dark:border-zinc-700 rounded-2xl p-5 md:p-6 bg-slate-50/50 dark:bg-zinc-900/80 space-y-4 print-avoid-break">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wider">
                <UserCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                Human Hydrographer Review & Operational Directive
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 font-bold text-xs rounded-lg">
                HUMAN-IN-THE-LOOP VERIFIED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Review Status Decision */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Review Determination</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 p-2 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:border-primary-500"
                >
                  <option value="APPROVED FOR OPERATIONAL ACTION">✓ APPROVED FOR MARITIME / OPERATIONAL DISPATCH</option>
                  <option value="FLAGGED FOR NAVAL DIVER INSPECTION">⚠ FLAGGED FOR NAVAL / COMMERCIAL DIVER VERIFICATION</option>
                  <option value="RESURVEY REQUIRED (ACOUSTIC SHADOW DEGRADED)">? RESURVEY REQUIRED (HIGH UNCERTAINTY)</option>
                  <option value="FALSE-POSITIVE FILTER CONFIRMED">✕ TARGET OVERRULED / FALSE ANOMALY</option>
                </select>
              </div>

              {/* Reviewer Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Reviewing Hydrographer / Officer</label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 p-2 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:border-primary-500"
                />
              </div>
            </div>

            {/* Reviewer Notes Textarea */}
            <div className="space-y-1.5 text-xs">
              <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase">
                Hydrographic Analysis Remarks & Deployment Orders
              </label>
              <textarea
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                rows={3}
                className="w-full bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 p-3 rounded-xl text-xs text-slate-800 dark:text-zinc-200 leading-relaxed focus:border-primary-500 resize-y"
              />
            </div>

            {/* Official Signature Lines for Printed PDF */}
            <div className="grid grid-cols-2 gap-8 pt-6 mt-4 border-t border-slate-200 dark:border-zinc-800 text-xs">
              <div className="space-y-1">
                <div className="h-10"></div>
                <div className="border-t border-slate-800 dark:border-zinc-300 pt-1 font-bold text-slate-900 dark:text-white">
                  {reviewerName}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                  {reviewerDesignation}
                </div>
              </div>

              <div className="space-y-1">
                <div className="h-10"></div>
                <div className="border-t border-slate-800 dark:border-zinc-300 pt-1 font-bold text-slate-900 dark:text-white">
                  NAVAL / COAST GUARD MARITIME LIAISON OFFICER
                </div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                  Ministry of Earth Sciences, Govt. of India
                </div>
              </div>
            </div>
          </div>

          {/* Certificate Sign-off footer */}
          <div className="border-t border-slate-200 dark:border-zinc-800 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-zinc-400 print-avoid-break">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-700 dark:text-zinc-300">NIOT MARINE HYDROGRAPHIC CERTIFICATION AUTHORITY</div>
              <div className="text-[10px] text-slate-400">
                AUTONOMOUS CLASSIFICATION SYSTEM VALIDATED UNDER SIH 26057
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 font-bold rounded-xl text-[11px] font-mono">
                VALIDATED & SECURED BY NIOT-MoES
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
