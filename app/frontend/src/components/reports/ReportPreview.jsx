import { X, Printer, Download, Shield, Navigation, Leaf, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { surveys, detections } from '../../data/mockData';
import { getRouteOptimizationSummary, candidateRoutes } from '../../data/routeMockData';

export default function ReportPreview({ report, onClose }) {
  if (!report) return null;

  const survey = surveys.find((s) => s.id === report.survey);
  const reportDetections = detections.filter((d) => d.survey === report.survey);
  const ecoRoute = getRouteOptimizationSummary(candidateRoutes[3]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto">
      <div className="card max-w-3xl w-full max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-0">
        {/* Sticky Header Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-ocean-blue/10 dark:bg-cyan/10 text-ocean-blue dark:text-cyan">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                Hydrographic Survey Inspection Report
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Report Reference: #{report.id || 'RPT-024'} | Survey: #{report.survey}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-secondary text-xs sm:text-sm py-2 px-3 flex items-center gap-1.5"
            >
              <Printer size={15} /> Print / PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Classification Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
              <Shield size={16} className="text-cyan-500" />
              <span>CLASSIFICATION: NAVAL HYDROGRAPHIC & AI SURVEY</span>
            </div>
            <span className="font-mono text-slate-500">Status: OFFICIAL RELEASE</span>
          </div>

          {/* Survey Metadata Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-[11px] uppercase font-semibold text-slate-400">Survey Location</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {survey?.location || 'Arabian Sea'}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase font-semibold text-slate-400">Execution Date</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {report.date}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase font-semibold text-slate-400">Sensor Model</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                Side-Scan Sonar (120kHz)
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase font-semibold text-slate-400">Vessel Unit</p>
              <p className="text-sm font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
                INS Surveyor Alpha
              </p>
            </div>
          </div>

          {/* Executive Summary Stats */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
              Executive Survey Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-xs text-slate-500">Total Detections</span>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {report.detections}
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5">
                <span className="text-xs text-red-600 dark:text-red-400 font-semibold">High Risk</span>
                <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">
                  {reportDetections.filter((d) => d.risk === 'HIGH').length || 3}
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Medium Risk</span>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {reportDetections.filter((d) => d.risk === 'MEDIUM').length || 2}
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Verified Targets</span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {reportDetections.filter((d) => d.status === 'Verified').length || 1}
                </p>
              </div>
            </div>
          </div>

          {/* Eco-Optimized Cleanup Trajectory Strategy */}
          <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 dark:bg-cyan-500/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation size={18} className="text-cyan-500" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Eco-Optimized Debris Cleanup Route Plan
                </h4>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500 text-white flex items-center gap-1">
                <Leaf size={12} /> SUSTAINABLE TRAJECTORY
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-500">Route Traversal:</span>
                <p className="font-bold text-slate-900 dark:text-slate-100">{ecoRoute.selectedRoute.distanceKm} km</p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">↓ {ecoRoute.distanceSaved} km saved</span>
              </div>
              <div>
                <span className="text-slate-500">Estimated Duration:</span>
                <p className="font-bold text-slate-900 dark:text-slate-100">{ecoRoute.selectedRoute.timeMin} min</p>
                <span className="text-[10px] text-slate-500">At 8 knots</span>
              </div>
              <div>
                <span className="text-slate-500">Estimated CO₂:</span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400">{ecoRoute.selectedRoute.co2Kg} kg</p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">↓ {ecoRoute.co2ReductionPct}% reduction</span>
              </div>
              <div>
                <span className="text-slate-500">Traversal Order:</span>
                <p className="font-bold text-cyan-600 dark:text-cyan-400 font-mono text-[11px] truncate">
                  {ecoRoute.selectedRoute.sequence.join(' → ')}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Detections Breakdown Table */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
              Identified Object Telemetry
            </h3>
            
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Target ID</th>
                    <th className="p-3">Classification</th>
                    <th className="p-3">Confidence</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Coordinates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {reportDetections.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">{d.id}</td>
                      <td className="p-3">{d.classification}</td>
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {d.confidence}%
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                            d.risk === 'HIGH' ? 'bg-red-500' : d.risk === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        >
                          {d.risk}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-500">{d.coordinates}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Analyst Sign-off */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Analyst Sign-off & Verification
                </p>
                <p className="text-[11px] text-slate-500">
                  Verified by Senior Hydrographer A. Sharma (#SH-8492)
                </p>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 text-right font-mono">
              Timestamp: {new Date().toLocaleDateString()} | SONAR-AI Engine v2.4
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
