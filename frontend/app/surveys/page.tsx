'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { SurveyRecord } from '@/types';
import { getAllSurveys } from '@/services/api';
import {
  FolderArchive,
  Plus,
  Compass,
  Waves,
  ShieldAlert,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  Radio,
} from 'lucide-react';

export default function SurveyArchivePage() {
  const [surveys, setSurveys] = useState<SurveyRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getAllSurveys();
        setSurveys(data);
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredSurveys = surveys.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.metadata.vessel_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4 font-mono">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e293b] pb-3">
        <div>
          <h1 className="text-lg font-black tracking-wider text-slate-100 uppercase flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-cyan-400" />
            ACOUSTIC SURVEY ARCHIVE // NIOT DATA LAKE
          </h1>
          <p className="text-xs text-slate-400">
            Historical side-scan sonar waterfall missions, acoustic tracklines, and automated detection runs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/surveys/new"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#06b6d4] hover:bg-[#22d3ee] text-[#0b1329] font-bold text-xs uppercase tracking-wider rounded-xs transition-colors shadow-md shadow-cyan-950"
          >
            <Plus className="w-4 h-4" />
            <span>INGEST NEW SURVEY</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-2 bg-[#0b1329] border border-[#1e293b] p-2 rounded-xs">
        <Search className="w-4 h-4 text-cyan-400 ml-1" />
        <input
          type="text"
          placeholder="Search by survey ID, transect name, vessel, or filename..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none text-xs text-slate-200 focus:outline-none w-full font-mono placeholder:text-slate-600"
        />
        <span className="text-[11px] text-slate-500 shrink-0 font-mono-tabular">
          {filteredSurveys.length} RECORDS FOUND
        </span>
      </div>

      {/* Survey Records Table / Cards */}
      <div className="space-y-3">
        {filteredSurveys.map((survey) => (
          <div
            key={survey.id}
            className="bg-[#0b1329] hover:bg-[#0e1935] border border-[#1e293b] hover:border-cyan-500/70 p-4 rounded-xs transition-all space-y-3 reticle-box group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xs bg-[#111d38] border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                  <Radio className="w-5 h-5 group-hover:animate-ping-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-cyan-300 tracking-wider">
                      {survey.id}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-700 text-emerald-400 font-bold text-[10px] rounded-xs">
                      {survey.status}
                    </span>
                  </div>
                  <h2 className="text-xs font-semibold text-slate-200 mt-0.5">
                    {survey.title}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/surveys/${survey.id}`}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-xs flex items-center gap-1 transition-colors"
                >
                  <span>LAUNCH WORKSTATION</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Hydrographic Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-400 bg-[#070e20] p-2.5 rounded-xs border border-slate-800/60">
              <div>
                <span className="text-[10px] text-slate-500 block">VESSEL & TOWFISH</span>
                <span className="font-bold text-slate-200">{survey.metadata.vessel_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">SWATH / RESOLUTION</span>
                <span className="font-bold text-cyan-300 font-mono-tabular">
                  {survey.metadata.swath_range_m}m @ {survey.metadata.resolution_m_px}m/px
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">TRANSECT WAYPOINTS</span>
                <span className="font-mono-tabular text-slate-300 text-[11px]">
                  {survey.metadata.start_coords[0].toFixed(2)}°N, {survey.metadata.start_coords[1].toFixed(2)}°E
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">RAW FILENAME</span>
                <span className="truncate block text-slate-300 text-[11px]">{survey.filename}</span>
              </div>
            </div>

            {/* Anomaly Breakdown Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span className="font-bold text-slate-300">
                  {survey.total_anomalies} HAZARDS IDENTIFIED:
                </span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="px-1.5 py-0.5 bg-red-950 text-red-400 border border-red-800 rounded-xs font-bold">
                    {survey.critical_count} CRITICAL
                  </span>
                  <span className="px-1.5 py-0.5 bg-orange-950 text-orange-400 border border-orange-800 rounded-xs font-bold">
                    {survey.high_count} HIGH
                  </span>
                  <span className="px-1.5 py-0.5 bg-amber-950 text-amber-400 border border-amber-800 rounded-xs font-bold">
                    {survey.medium_count} MEDIUM
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>INGESTED: {new Date(survey.uploaded_at).toUTCString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
