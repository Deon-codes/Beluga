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
      s.title?.toLowerCase().includes(search.toLowerCase()) ||
      s.id?.toLowerCase().includes(search.toLowerCase()) ||
      s.metadata?.vessel_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.filename?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4 ">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-3">
        <div>
          <h1 className="text-lg text-2xl font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Survey Archive
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-500 dark:text-slate-400">
            View and manage acoustic survey missions and detection runs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/surveys/new"
            className="flex items-center gap-1.5 px-3 py-2 premium-button text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-md shadow-cyan-950"
          >
            <Plus className="w-4 h-4" />
            <span>New Survey</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-2 rounded-xl">
        <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-1" />
        <input
          type="text"
          placeholder="Search by survey ID, transect name, vessel, or filename..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none text-xs text-slate-700 dark:text-slate-700 dark:text-slate-200 focus:outline-none w-full  placeholder:text-slate-600"
        />
        <span className="text-[11px] text-slate-500 shrink-0 ">
          {filteredSurveys.length} RECORDS FOUND
        </span>
      </div>

      {/* Survey Records Table / Cards */}
      <div className="space-y-3">
        {filteredSurveys.map((survey) => (
          <div
            key={survey.id}
            className="bg-white dark:bg-zinc-900 hover:bg-[#0e1935] border border-slate-200 dark:border-zinc-800 hover:border-blue-500/70 p-4 rounded-xl transition-all space-y-3  group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-800/80 pb-2.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 border border-blue-500/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Radio className="w-5 h-5 group-hover:animate-ping-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-blue-500 dark:text-blue-300 tracking-wider">
                      {survey.id}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] rounded-xl">
                      {survey.status}
                    </span>
                  </div>
                  <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-700 dark:text-slate-200 mt-0.5">
                    {survey.title}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/surveys/${survey.id}`}
                  className="px-3 py-1.5 premium-button text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
                >
                  <span>View Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Hydrographic Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-500 dark:text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800/60">
              <div>
                <span className="text-[10px] text-slate-500 block">VESSEL & TOWFISH</span>
                <span className="font-bold text-slate-700 dark:text-slate-700 dark:text-slate-200">{survey.metadata?.vessel_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">SWATH / RESOLUTION</span>
                <span className="font-bold text-blue-500 dark:text-blue-300 ">
                  {survey.metadata?.swath_range_m || '?'}m @ {survey.metadata?.resolution_m_px || '?'}m/px
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">TRANSECT WAYPOINTS</span>
                <span className=" text-slate-600 dark:text-slate-600 dark:text-slate-300 text-[11px]">
                  {survey.metadata?.start_coords?.[0]?.toFixed(2) || 'N/A'}°N, {survey.metadata?.start_coords?.[1]?.toFixed(2) || 'N/A'}°E
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">RAW FILENAME</span>
                <span className="truncate block text-slate-600 dark:text-slate-600 dark:text-slate-300 text-[11px]">{survey.filename}</span>
              </div>
            </div>

            {/* Anomaly Breakdown Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-600 dark:text-red-400 shrink-0" />
                <span className="font-bold text-slate-600 dark:text-slate-600 dark:text-slate-300">
                  {survey.total_anomalies ?? 0} HAZARDS IDENTIFIED:
                </span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="px-1.5 py-0.5 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-xl font-bold">
                    {survey.critical_count ?? 0} CRITICAL
                  </span>
                  <span className="px-1.5 py-0.5 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 rounded-xl font-bold">
                    {survey.high_count ?? 0} HIGH
                  </span>
                  <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded-xl font-bold">
                    {survey.medium_count ?? 0} MEDIUM
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
