'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AnomalyDetection, RiskLevel } from '@/types';
import { getAllDetections } from '@/services/api';
import { SONAR_CLASSES } from '@/lib/sonar-data';
import { RiskBadge } from '@/components/RiskBadge';
import { GeoBadge } from '@/components/GeoBadge';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronRight,
  ArrowUpDown,
  Filter,
  Crosshair,
  ShieldAlert,
  Download,
  Eye,
  Radio,
} from 'lucide-react';

export default function DetectionsCatalogPage() {
  const [allDetections, setAllDetections] = useState<AnomalyDetection[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedRisks, setSelectedRisks] = useState<RiskLevel[]>([]);
  const [minConfidence, setMinConfidence] = useState<number>(60);
  const [onlyShadows, setOnlyShadows] = useState<boolean>(false);
  const [onlyDiverFlagged, setOnlyDiverFlagged] = useState<boolean>(false);

  // Sorting
  const [sortField, setSortField] = useState<'id' | 'confidence_pct' | 'risk' | 'dimensions'>('risk');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Multi-select dropdown toggle
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getAllDetections();
        setAllDetections(data);
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleToggleClass = (cls: string) => {
    setSelectedClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  };

  const handleToggleRisk = (risk: RiskLevel) => {
    setSelectedRisks((prev) =>
      prev.includes(risk) ? prev.filter((r) => r !== risk) : [...prev, risk]
    );
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedClasses([]);
    setSelectedRisks([]);
    setMinConfidence(60);
    setOnlyShadows(false);
    setOnlyDiverFlagged(false);
  };

  // Filter and sort detections
  const filteredDetections = useMemo(() => {
    const riskPriority: Record<RiskLevel, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    return allDetections
      .filter((d) => {
        // Search query
        if (search) {
          const q = search.toLowerCase();
          const match =
            d.id.toLowerCase().includes(q) ||
            d.class_name.toLowerCase().includes(q) ||
            (d.survey_id && d.survey_id.toLowerCase().includes(q)) ||
            (d.notes && d.notes.toLowerCase().includes(q));
          if (!match) return false;
        }

        // 17-class filter
        if (selectedClasses.length > 0 && !selectedClasses.includes(d.class_name)) {
          return false;
        }

        // Risk filter
        if (selectedRisks.length > 0 && !selectedRisks.includes(d.risk)) {
          return false;
        }

        // Confidence filter
        if (d.confidence_pct < minConfidence) {
          return false;
        }

        // Shadows filter
        if (onlyShadows && !d.has_shadow) {
          return false;
        }

        // Diver recovery flag
        if (onlyDiverFlagged && !d.diver_recovery_flagged) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'confidence_pct') {
          diff = a.confidence_pct - b.confidence_pct;
        } else if (sortField === 'risk') {
          diff = riskPriority[a.risk] - riskPriority[b.risk];
        } else if (sortField === 'dimensions') {
          const aLen = a.dimensions_m.length_m ?? a.dimensions_m.length ?? 0;
          const bLen = b.dimensions_m.length_m ?? b.dimensions_m.length ?? 0;
          diff = aLen - bLen;
        } else {
          diff = a.id.localeCompare(b.id);
        }
        return sortAsc ? diff : -diff;
      });
  }, [
    allDetections,
    search,
    selectedClasses,
    selectedRisks,
    minConfidence,
    onlyShadows,
    onlyDiverFlagged,
    sortField,
    sortAsc,
  ]);

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4  select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-3">
        <div>
          <h1 className="text-lg font-black tracking-wider text-slate-900 dark:text-slate-100 uppercase flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            GLOBAL HAZARD CATALOG // 17-CLASS ACOUSTIC INVENTORY
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Multi-spectral side-scan sonar anomaly records, bounding geometry, and divergence certainty
          </p>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 ">
          TOTAL INDEXED: <strong className="text-blue-500 dark:text-blue-300 font-bold">{allDetections.length}</strong> | FILTERED:{' '}
          <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{filteredDetections.length}</strong>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3 rounded-xl space-y-3 ">
        {/* Search and Class selector */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Text Search */}
          <div className="sm:col-span-6 relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-xl">
            <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search by Anomaly ID, target class, survey ID, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-700 dark:text-slate-200 focus:outline-none w-full  placeholder:text-slate-600"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-500 hover:text-slate-700 dark:text-slate-200">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 17-Class Multi-Select Dropdown */}
          <div className="sm:col-span-6 relative">
            <button
              type="button"
              onClick={() => setClassDropdownOpen(!classDropdownOpen)}
              className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-700 hover:border-cyan-600 px-3 py-1.5 rounded-xl text-xs text-slate-700 dark:text-slate-200 "
            >
              <div className="flex items-center gap-1.5 truncate">
                <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">
                  {selectedClasses.length === 0
                    ? 'All 17 Sonar Classes Selected'
                    : `${selectedClasses.length} Classes Selected`}
                </span>
              </div>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold ml-2">▼</span>
            </button>

            {/* Dropdown Menu */}
            {classDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1 bg-slate-50 dark:bg-slate-900 border border-blue-200 dark:border-blue-800 shadow-2xl p-2 rounded-xl z-50 max-h-60 overflow-y-auto space-y-1">
                <div className="flex justify-between pb-1 mb-1 border-b border-slate-200 dark:border-zinc-800 text-[10px]">
                  <button
                    onClick={() => setSelectedClasses([...SONAR_CLASSES])}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedClasses([])}
                    className="text-slate-500 dark:text-slate-400 hover:underline"
                  >
                    Clear
                  </button>
                </div>
                {SONAR_CLASSES.map((cls) => {
                  const isChecked = selectedClasses.includes(cls);
                  return (
                    <label
                      key={cls}
                      className="flex items-center gap-2 p-1 hover:bg-slate-100 dark:bg-slate-700 rounded-xl cursor-pointer text-xs text-slate-600 dark:text-slate-300"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleClass(cls)}
                        className="rounded-xl border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                      />
                      <span className="truncate">{cls}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Risk Level Pills, Confidence Slider, and Flags */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200 dark:border-zinc-800/80 text-xs">
          {/* Risk Level Toggles */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-bold mr-1">RISK:</span>
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as RiskLevel[]).map((r) => {
              const active = selectedRisks.includes(r);
              return (
                <button
                  key={r}
                  onClick={() => handleToggleRisk(r)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-xl border transition-colors ${
                    active
                      ? r === 'CRITICAL'
                        ? 'bg-red-950 text-red-300 border-red-500'
                        : r === 'HIGH'
                        ? 'bg-orange-950 text-orange-300 border-orange-500'
                        : r === 'MEDIUM'
                        ? 'bg-amber-950 text-amber-300 border-amber-500'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-500'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-zinc-800 hover:border-slate-600'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>

          {/* Confidence Slider */}
          <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
            <span className="text-slate-500 dark:text-slate-400">MIN CONFIDENCE:</span>
            <input
              type="range"
              min="40"
              max="95"
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="w-24 accent-cyan-400 cursor-pointer"
            />
            <span className="font-bold text-blue-500 dark:text-blue-300  min-w-[35px]">
              {minConfidence}%
            </span>
          </div>

          {/* Shadow & Diver Recovery toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlyShadows(!onlyShadows)}
              className={`px-2 py-0.5 text-[10px] rounded-xl border transition-colors ${
                onlyShadows
                  ? 'bg-red-950 border-red-600 text-red-300 font-bold'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              HAS SHADOW
            </button>

            <button
              onClick={() => setOnlyDiverFlagged(!onlyDiverFlagged)}
              className={`px-2 py-0.5 text-[10px] rounded-xl border transition-colors ${
                onlyDiverFlagged
                  ? 'bg-amber-950 border-amber-600 text-amber-300 font-bold'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              DIVER FLAGGED
            </button>

            <button
              onClick={clearFilters}
              className="text-[10px] text-slate-500 hover:text-blue-600 dark:text-blue-400 underline ml-2"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* High-Density Global Hazard Table */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-10 text-[11px] uppercase tracking-wider">
              <tr>
                <th
                  onClick={() => {
                    setSortField('id');
                    setSortAsc(!sortAsc);
                  }}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-500 dark:text-blue-300"
                >
                  <div className="flex items-center gap-1">
                    <span>ANOMALY ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3 font-semibold">CLASS NAME</th>
                <th
                  onClick={() => {
                    setSortField('risk');
                    setSortAsc(!sortAsc);
                  }}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-500 dark:text-blue-300"
                >
                  <div className="flex items-center gap-1">
                    <span>RISK LEVEL</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('confidence_pct');
                    setSortAsc(!sortAsc);
                  }}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-500 dark:text-blue-300"
                >
                  <div className="flex items-center gap-1">
                    <span>CONFIDENCE ± σ</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('dimensions');
                    setSortAsc(!sortAsc);
                  }}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:text-blue-500 dark:text-blue-300"
                >
                  <div className="flex items-center gap-1">
                    <span>METRIC DIMS (L×W×H)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3 font-semibold">WGS84 COORDINATES</th>
                <th className="py-2.5 px-3 font-semibold">SURVEY ID</th>
                <th className="py-2.5 px-3 font-semibold text-right">ACTION</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#1e293b] text-slate-600 dark:text-slate-300 ">
              {filteredDetections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    No acoustic anomalies found matching selected criteria.
                  </td>
                </tr>
              ) : (
                filteredDetections.map((anom) => (
                  <tr
                    key={anom.id}
                    className="hover:bg-[#0e1935] transition-colors group text-xs"
                  >
                    {/* Anomaly ID */}
                    <td className="py-2.5 px-3 font-bold text-blue-500 dark:text-blue-300 flex items-center gap-1.5">
                      <Crosshair className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>{anom.id}</span>
                      {anom.diver_recovery_flagged && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Flagged for diver" />
                      )}
                    </td>

                    {/* Class */}
                    <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-200">
                      <div className="truncate max-w-[200px]">{anom.class_name}</div>
                    </td>

                    {/* Risk Badge */}
                    <td className="py-2.5 px-3">
                      <RiskBadge level={anom.risk} size="sm" />
                    </td>

                    {/* Confidence ± Uncertainty */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-500 dark:text-blue-300">
                          {anom.confidence_pct.toFixed(1)}%
                        </span>
                        <span className="text-slate-500 text-[10px]">
                          ±{(anom.uncertainty_std ?? 0.045).toFixed(3)}σ
                        </span>
                      </div>
                    </td>

                    {/* Dimensions */}
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-200">
                      <span>
                        {(anom.dimensions_m.length_m ?? anom.dimensions_m.length ?? 0).toFixed(1)}m × {(anom.dimensions_m.width_m ?? anom.dimensions_m.width ?? 0).toFixed(1)}m
                        {(anom.dimensions_m.height_m ?? anom.dimensions_m.height) != null && (
                          <span className="text-blue-600 dark:text-blue-400"> × {(anom.dimensions_m.height_m ?? anom.dimensions_m.height ?? 0).toFixed(1)}m</span>
                        )}
                      </span>
                    </td>

                    {/* WGS84 Geo */}
                    <td className="py-2.5 px-3">
                      <GeoBadge
                        lat={anom.location.lat ?? 13.0827}
                        lon={anom.location.lon ?? 80.3128}
                        confidence={anom.location.geo_confidence || 'estimated'}
                        compact
                      />
                    </td>

                    {/* Survey ID */}
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {anom.survey_id || 'SURV-2026-NIOT-088'}
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        href={`/surveys/${anom.survey_id || 'SURV-2026-NIOT-088'}`}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:bg-blue-900 border border-slate-700 hover:border-blue-500 text-blue-500 dark:text-blue-300 text-[11px] font-bold rounded-xl transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>INSPECT</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
