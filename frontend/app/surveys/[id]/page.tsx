'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnomalyDetection, SurveyRecord } from '@/types';
import {
  getSurveyDetections,
  getSurveyStatus,
  getSurveyById,
  toggleDiverFlag,
  getReportDownloadUrl,
  buildStageStatuses,
} from '@/services/api';
import { SonarImageViewer } from '@/components/SonarImageViewer';
import { ProcessingStepper } from '@/components/ProcessingStepper';
import { ConfidenceMeter } from '@/components/ConfidenceMeter';
import { GeoBadge } from '@/components/GeoBadge';
import { RiskBadge } from '@/components/RiskBadge';
import {
  ShieldAlert,
  Crosshair,
  Ruler,
  Anchor,
  Download,
  Flag,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  AlertTriangle,
  Waves,
  Cpu,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface SurveyEvaluatorProps {
  params: Promise<{ id: string }>;
}

export default function SurveyEvaluatorPage({ params }: SurveyEvaluatorProps) {
  const resolvedParams = use(params);
  const surveyId = resolvedParams.id;
  const router = useRouter();

  const [survey, setSurvey] = useState<SurveyRecord | null>(null);
  const [detections, setDetections] = useState<AnomalyDetection[]>([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyDetection | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [diverFlagged, setDiverFlagged] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load survey & detection records + setup polling
  useEffect(() => {
    let isMounted = true;

    async function checkSurvey() {
      try {
        // First check job status
        const statusRes = await getSurveyStatus(surveyId);

        if (statusRes && statusRes.stage === 'COMPLETED') {
          // Survey is completed — fetch full detections and image
          const detRes = await getSurveyDetections(surveyId);
          if (isMounted && detRes && detRes.survey) {
            setSurvey(detRes.survey);
            setDetections(detRes.detections || []);
            if (detRes.detections && detRes.detections.length > 0) {
              setSelectedAnomaly(detRes.detections[0]);
              setDiverFlagged(!!detRes.detections[0].diver_recovery_flagged);
            }
            setIsPolling(false);
            setLoading(false);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          }
        } else {
          // Still processing or pending
          if (isMounted) {
            setIsPolling(true);
            setSurvey((prev) => {
              if (prev) {
                return {
                  ...prev,
                  status: (statusRes.stage as any) || 'PROCESSING',
                  progress_pct: statusRes.progress_pct || 20,
                  stages: buildStageStatuses(statusRes.stage, statusRes.progress_pct || 20),
                };
              }
              return {
                id: surveyId,
                title: `SURVEY ${surveyId}`,
                filename: 'sonar_scan.raw',
                imageUrl: 'procedural:pass03',
                uploaded_at: new Date().toISOString(),
                status: (statusRes.stage as any) || 'PROCESSING',
                progress_pct: statusRes.progress_pct || 20,
                total_anomalies: 0,
                critical_count: 0,
                high_count: 0,
                medium_count: 0,
                low_count: 0,
                metadata: {
                  vessel_name: 'ORV Sagar Nidhi (NIOT)',
                  sonar_frequency_khz: 455,
                  swath_range_m: 100,
                  resolution_m_px: 0.05,
                  altitude_m: 12.5,
                  heading_deg: 42.5,
                  start_coords: [13.0827, 80.3128],
                  end_coords: [13.1492, 80.3784],
                },
                stages: buildStageStatuses(statusRes.stage, statusRes.progress_pct || 20),
                detections: [],
              };
            });
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn('Error fetching survey state:', err);
        if (isMounted) setLoading(false);
      }
    }

    checkSurvey();

    // Set up 1500ms polling loop while processing
    pollIntervalRef.current = setInterval(checkSurvey, 1500);

    return () => {
      isMounted = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [surveyId]);

  // Handle selecting an anomaly (from canvas click or list)
  const handleSelectAnomaly = (anomaly: AnomalyDetection) => {
    setSelectedAnomaly(anomaly);
    setDiverFlagged(!!anomaly.diver_recovery_flagged);
    setActionSuccessMsg(null);
  };

  // Next hazard shortcut traversal
  const handleNextHazard = () => {
    if (!detections.length || !selectedAnomaly) return;
    const currentIndex = detections.findIndex((d) => d.id === selectedAnomaly.id);
    const nextIndex = (currentIndex + 1) % detections.length;
    handleSelectAnomaly(detections[nextIndex]);
  };

  // Toggle diver recovery flag
  const handleToggleDiverFlag = async () => {
    if (!selectedAnomaly || !survey) return;
    const newFlagState = await toggleDiverFlag(survey.id, selectedAnomaly.id);
    setDiverFlagged(newFlagState);
    setSelectedAnomaly({
      ...selectedAnomaly,
      diver_recovery_flagged: newFlagState,
    });
    setDetections((prev) =>
      prev.map((d) =>
        d.id === selectedAnomaly.id ? { ...d, diver_recovery_flagged: newFlagState } : d
      )
    );
    setActionSuccessMsg(
      newFlagState
        ? `Flagged ${selectedAnomaly.id} for Navy / Commercial Diver Recovery Team`
        : `Removed diver flag for ${selectedAnomaly.id}`
    );
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Export single anomaly snippet
  const handleExportAnomaly = () => {
    if (!selectedAnomaly) return;
    const blob = new Blob([JSON.stringify(selectedAnomaly, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NIOT_ANOMALY_${selectedAnomaly.id}_${selectedAnomaly.class_name.replace(/\s+/g, '_')}.json`;
    a.click();
    setActionSuccessMsg(`Exported ${selectedAnomaly.id} hydrographic metadata package.`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  if (loading && !survey) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-3 font-mono">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        <div className="text-xs text-cyan-300 font-bold uppercase tracking-wider">
          LOADING HYDROGRAPHIC WATERFALL WORKSTATION...
        </div>
      </div>
    );
  }

  const currentSurvey = survey || {
    id: surveyId,
    title: 'Offshore Side-Scan Sonar Inspection',
    filename: 'NIOT_SAS_PASS.raw',
    imageUrl: 'procedural:pass03',
    uploaded_at: new Date().toISOString(),
    status: 'COMPLETED' as const,
    progress_pct: 100,
    total_anomalies: detections.length,
    critical_count: detections.filter((d) => d.risk === 'CRITICAL').length,
    high_count: detections.filter((d) => d.risk === 'HIGH').length,
    medium_count: detections.filter((d) => d.risk === 'MEDIUM').length,
    low_count: detections.filter((d) => d.risk === 'LOW').length,
    metadata: {
      vessel_name: 'ORV Sagar Nidhi (NIOT)',
      sonar_frequency_khz: 455,
      swath_range_m: 100,
      resolution_m_px: 0.05,
      altitude_m: 12.5,
      heading_deg: 42.5,
      start_coords: [13.0827, 80.3128] as [number, number],
      end_coords: [13.1492, 80.3784] as [number, number],
      area_coverage_km2: 14.8,
      water_depth_m: 64.2,
      sound_velocity_mps: 1512.4,
      mode: 'Ping Header Metadata' as const,
      model_version: 'YOLOv8s-Sonar v2.1-NIOT',
    },
    detections: detections,
    stages: buildStageStatuses('COMPLETED', 100),
  };

  // Safe metric dimension accessors
  const selLength = selectedAnomaly
    ? (selectedAnomaly.dimensions_m.length_m ?? selectedAnomaly.dimensions_m.length ?? 0)
    : 0;
  const selWidth = selectedAnomaly
    ? (selectedAnomaly.dimensions_m.width_m ?? selectedAnomaly.dimensions_m.width ?? 0)
    : 0;
  const selHeight = selectedAnomaly
    ? (selectedAnomaly.dimensions_m.height_m ?? selectedAnomaly.dimensions_m.height ?? null)
    : null;

  return (
    <div className="flex flex-col h-full overflow-hidden font-mono select-none">
      {/* Top Survey Header Strip */}
      <div className="h-10 px-4 bg-[#070e20] border-b border-[#1e293b] flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/surveys"
            className="text-slate-400 hover:text-cyan-300 flex items-center gap-1 text-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">ALL SURVEYS</span>
          </Link>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-cyan-300 tracking-wider">
              {currentSurvey.id}
            </span>
            <span className="text-slate-300 truncate hidden md:inline">
              — {currentSurvey.title}
            </span>
          </div>
          {isPolling && (
            <span className="flex items-center gap-1 text-cyan-400 text-[10px] font-bold animate-pulse px-1.5 py-0.5 bg-cyan-950/80 border border-cyan-800 rounded-xs">
              <RefreshCw className="w-3 h-3 animate-spin" />
              ANALYZING ({currentSurvey.status})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <div className="hidden lg:flex items-center gap-2 text-slate-400">
            <span>
              VESSEL: <strong className="text-slate-200">{currentSurvey.metadata.vessel_name}</strong>
            </span>
            <span className="text-slate-700">|</span>
            <span>
              ALT: <strong className="text-cyan-300">{currentSurvey.metadata.altitude_m}m</strong>
            </span>
            <span className="text-slate-700">|</span>
            <span>
              RES: <strong className="text-cyan-300">{currentSurvey.metadata.resolution_m_px}m/px</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href={getReportDownloadUrl(currentSurvey.id, 'json')}
              download={`report_${currentSurvey.id}.json`}
              className="flex items-center gap-1 px-2 py-1 bg-[#111d38] hover:bg-slate-800 border border-slate-700 hover:border-cyan-600 rounded-xs text-slate-200 transition-colors"
              title="Download Raw JSON Hydrographic Report"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">JSON</span>
            </a>
            <a
              href={getReportDownloadUrl(currentSurvey.id, 'csv')}
              download={`report_${currentSurvey.id}.csv`}
              className="flex items-center gap-1 px-2 py-1 bg-[#111d38] hover:bg-slate-800 border border-slate-700 hover:border-cyan-600 rounded-xs text-slate-200 transition-colors"
              title="Download Hydrographic CSV Matrix"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">CSV</span>
            </a>
          </div>
        </div>
      </div>

      {/* Dual-Pane Layout: Left ~70% Sonar Canvas + Right ~30% Hydrographic Inspector */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT PANE: HTML5 SONAR WATERFALL CANVAS (~70%) */}
        <div className="flex-1 flex flex-col min-w-0 h-[55vh] lg:h-full relative bg-[#070d1e]">
          <SonarImageViewer
            detections={detections}
            selectedDetectionId={selectedAnomaly?.id}
            onSelectDetection={handleSelectAnomaly}
            surveyTitle={currentSurvey.title}
            swathRangeM={currentSurvey.metadata.swath_range_m}
            resolutionMPerPx={currentSurvey.metadata.resolution_m_px}
            imageUrl={currentSurvey.imageUrl}
            preset={
              surveyId.includes('CHENN')
                ? 'pass01'
                : surveyId.includes('ANDMN')
                ? 'pass02'
                : 'pass03'
            }
            className="w-full h-full"
          />

          {/* Bottom Quick Anomaly Strip */}
          <div className="h-12 bg-[#0b1329]/95 border-t border-[#1e293b] flex items-center px-3 gap-2 overflow-x-auto shrink-0 z-10">
            <span className="text-[10px] text-slate-400 uppercase font-bold shrink-0 flex items-center gap-1">
              <Crosshair className="w-3 h-3 text-cyan-400" />
              TARGETS ({detections.length}):
            </span>
            {detections.length === 0 && (
              <span className="text-[11px] text-slate-500 italic">
                {isPolling ? 'Pipeline active — extracting acoustic targets...' : 'No targets detected in this pass.'}
              </span>
            )}
            {detections.map((det) => {
              const isSel = det.id === selectedAnomaly?.id;
              const isCrit = det.risk === 'CRITICAL';
              return (
                <button
                  key={det.id}
                  onClick={() => handleSelectAnomaly(det)}
                  className={`px-2 py-1 text-[11px] font-mono rounded-xs border flex items-center gap-1.5 shrink-0 transition-colors ${
                    isSel
                      ? 'bg-cyan-950 text-cyan-200 border-cyan-400 ring-1 ring-cyan-400 font-bold'
                      : isCrit
                      ? 'bg-red-950/40 text-red-300 border-red-900/60 hover:border-red-500'
                      : 'bg-[#070e20] text-slate-400 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isCrit ? 'bg-red-400 animate-pulse' : 'bg-cyan-400'}`} />
                  <span>{det.id}</span>
                  <span className="text-[9px] opacity-75 truncate max-w-[90px]">{det.class_name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANE: HYDROGRAPHIC INSPECTOR (~30%) */}
        <div className="w-full lg:w-[410px] bg-[#0b1329] border-t lg:border-t-0 lg:border-l border-[#1e293b] flex flex-col h-[45vh] lg:h-full overflow-y-auto shrink-0 divide-y divide-[#1e293b]">
          {/* Action notification toast if triggered */}
          {actionSuccessMsg && (
            <div className="p-2.5 bg-cyan-950 border-b border-cyan-500 text-cyan-300 text-xs flex items-center gap-2 animate-pulse">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Stepper Component (Hydrographic AI Pipeline) */}
          <div className="p-3">
            <ProcessingStepper stages={currentSurvey.stages} />
          </div>

          {/* Inspector Panel: Selected Anomaly Target */}
          {selectedAnomaly ? (
            <div className="p-4 space-y-4 text-xs">
              {/* Header: Class + ID + Risk Badge with Left Color Accent */}
              <div
                className={`p-3 rounded-xs border-l-2 space-y-2 ${
                  selectedAnomaly.risk === 'CRITICAL'
                    ? 'bg-[#111d38] border-l-red-500'
                    : selectedAnomaly.risk === 'HIGH'
                    ? 'bg-[#111d38] border-l-orange-500'
                    : selectedAnomaly.risk === 'MEDIUM'
                    ? 'bg-[#111d38] border-l-amber-500'
                    : 'bg-[#111d38] border-l-emerald-500'
                }`}
              >
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span className="flex items-center gap-1 uppercase font-bold text-cyan-400">
                    <Crosshair className="w-3.5 h-3.5" />
                    TARGET CLASSIFICATION
                  </span>
                  <span className="font-mono-tabular">PING #{selectedAnomaly.ping_index || 1240}</span>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h2 className="text-base font-bold text-white tracking-tight leading-snug">
                      {selectedAnomaly.class_name}
                    </h2>
                    <RiskBadge level={selectedAnomaly.risk} size="sm" />
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono-tabular">
                    ID: <span className="text-cyan-300 font-bold">{selectedAnomaly.id}</span> | CLASS #{selectedAnomaly.class_id}
                  </div>
                </div>
              </div>

              {/* Confidence Meter Component */}
              <div className="bg-[#111d38] p-3 rounded-xs border border-[#1e293b] space-y-2">
                <ConfidenceMeter
                  confidencePct={selectedAnomaly.confidence_pct}
                  uncertaintyStd={selectedAnomaly.uncertainty_std ?? 0.045}
                  certainty={selectedAnomaly.certainty || 'MODERATE'}
                />
              </div>

              {/* Metric Dimensions Card */}
              <div className="bg-[#111d38] p-3 rounded-xs border border-[#1e293b] space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-[#1e293b] pb-1.5">
                  <span className="flex items-center gap-1.5 font-bold text-slate-200 uppercase">
                    <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                    ACOUSTIC SIZING & RELIEF
                  </span>
                  <span className="text-cyan-400 text-[10px] font-bold">WGS84 METRIC</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#0b1329] p-2 rounded-xs border border-[#1e293b]">
                    <div className="text-[9px] text-slate-500 uppercase mb-1">LENGTH</div>
                    <div className="text-base font-bold text-white font-mono-tabular leading-none">
                      {selLength.toFixed(1)}m
                    </div>
                  </div>
                  <div className="bg-[#0b1329] p-2 rounded-xs border border-[#1e293b]">
                    <div className="text-[9px] text-slate-500 uppercase mb-1">WIDTH</div>
                    <div className="text-base font-bold text-white font-mono-tabular leading-none">
                      {selWidth.toFixed(1)}m
                    </div>
                  </div>
                  <div className="bg-[#0b1329] p-2 rounded-xs border border-cyan-900/60">
                    <div className="text-[9px] text-cyan-400 font-bold uppercase mb-1">RELIEF (H)</div>
                    <div className="text-base font-bold text-cyan-300 font-mono-tabular leading-none">
                      {selHeight !== null ? `${selHeight.toFixed(1)}m` : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Shadow Derivation Formula Tag */}
                {selectedAnomaly.has_shadow && selectedAnomaly.shadow_vector && (
                  <div className="p-2.5 bg-[#070e20] border border-cyan-900/80 rounded-xs text-[10px] space-y-1 text-slate-300">
                    <div className="flex justify-between font-semibold text-cyan-300">
                      <span>SHADOW TRIGONOMETRY:</span>
                      <span>Ls = {selectedAnomaly.shadow_vector.length_m.toFixed(1)}m</span>
                    </div>
                    <div className="text-slate-400 font-mono leading-tight">
                      Ht = (Altitude × Shadow) / (Slant Range + Shadow) ={' '}
                      <strong className="text-cyan-200">
                        {selectedAnomaly.shadow_vector.estimated_height_m.toFixed(2)}m
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Geographic Coordinates & GeoBadge */}
              <div className="bg-[#111d38] p-3 rounded-xs border border-[#1e293b] space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-[#1e293b] pb-1">
                  <span className="flex items-center gap-1.5 font-bold text-slate-200 uppercase">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    WGS84 COORDINATES & FIX
                  </span>
                  <span className="text-[10px] text-slate-500">6-DECIMAL FIX</span>
                </div>

                <GeoBadge
                  lat={selectedAnomaly.location.lat ?? 13.0827}
                  lon={selectedAnomaly.location.lon ?? 80.3128}
                  confidence={selectedAnomaly.location.geo_confidence || 'estimated'}
                  className="w-full justify-between"
                />

                <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                  <span>
                    CHANNEL: <strong className="text-slate-200 uppercase">{selectedAnomaly.channel || 'PORT'}</strong>
                  </span>
                  <span>
                    SLANT RANGE:{' '}
                    <strong className="text-cyan-300 font-mono-tabular">
                      {selectedAnomaly.slant_range_m || 38.4}m
                    </strong>
                  </span>
                </div>
              </div>

              {/* Operational Notes / Acoustic Description */}
              {selectedAnomaly.notes && (
                <div className="p-2.5 bg-[#111d38] border border-[#1e293b] rounded-xs text-[11px] text-slate-300 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">HYDROGRAPHIC NOTES</div>
                  <p className="leading-relaxed text-slate-300">{selectedAnomaly.notes}</p>
                </div>
              )}

              {/* Action Buttons: Export / Diver Recovery / Next Hazard */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportAnomaly}
                    className="py-2 px-2 bg-transparent hover:bg-[#111d38] border border-[#1e293b] hover:border-cyan-600 rounded-xs text-[11px] font-bold text-white uppercase flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>EXPORT DATA</span>
                  </button>

                  <button
                    onClick={handleToggleDiverFlag}
                    className={`py-2 px-2 border rounded-xs text-[11px] font-bold uppercase flex items-center justify-center gap-1.5 transition-colors ${
                      diverFlagged
                        ? 'bg-amber-950 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                        : 'bg-transparent hover:bg-[#111d38] border-[#1e293b] text-slate-300'
                    }`}
                  >
                    <Flag className={`w-3.5 h-3.5 ${diverFlagged ? 'text-amber-400 fill-amber-400' : 'text-amber-400'}`} />
                    <span>{diverFlagged ? 'DIVER FLAGGED' : 'FLAG FOR DIVER'}</span>
                  </button>
                </div>

                <button
                  onClick={handleNextHazard}
                  className="w-full py-2.5 bg-[#06b6d4] hover:bg-[#22d3ee] text-[#0b1329] font-bold text-xs uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-cyan-950"
                >
                  <span>NEXT HAZARD TARGET</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 text-xs">
              {isPolling
                ? 'Processing sonar waterfall scan through 8-stage hydrographic pipeline...'
                : 'Select an anomaly bounding box on the waterfall canvas to inspect target telemetry.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
