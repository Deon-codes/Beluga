'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Radio,
  LayoutDashboard,
  UploadCloud,
  FolderArchive,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Bell,
  Cpu,
  Waves,
  Compass,
  Clock,
  Terminal,
} from 'lucide-react';

interface ShellLayoutProps {
  children: React.ReactNode;
}

export function ShellLayout({ children }: ShellLayoutProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [utcTime, setUtcTime] = useState<string>('');
  const [julianDate, setJulianDate] = useState<string>('');
  const [alertOpen, setAlertOpen] = useState(false);

  // Hydrographic UTC Clock update
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const zulu = now.toISOString().substring(11, 19) + 'Z';
      const year = now.getUTCFullYear();
      const start = new Date(Date.UTC(year, 0, 0));
      const diff = now.getTime() - start.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      const day = Math.floor(diff / oneDay);
      setUtcTime(zulu);
      setJulianDate(`DOY-${day.toString().padStart(3, '0')}.${year}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { label: 'Mission Command', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Ingest Log', href: '/surveys/new', icon: UploadCloud },
    { label: 'Survey Archive', href: '/surveys', icon: FolderArchive },
    { label: 'Hazard Catalog', href: '/detections', icon: Search },
    { label: 'Export Reports', href: '/reports', icon: FileText },
  ];

  // Derive route breadcrumb
  const getBreadcrumb = () => {
    if (pathname === '/dashboard' || pathname === '/') return 'MISSION COMMAND // TAC-OPS';
    if (pathname === '/surveys/new') return 'INGEST WORKSTATION // ACOUSTIC UPLOAD';
    if (pathname?.startsWith('/surveys/')) return 'EVALUATOR WORKSTATION // WATERFALL INSPECTOR';
    if (pathname === '/surveys') return 'SURVEY ARCHIVE // NIOT DATA LAKE';
    if (pathname === '/detections') return 'GLOBAL HAZARD CATALOG // 17-CLASS INVENTORY';
    if (pathname === '/reports') return 'COMPLIANCE & EXPORT TERMINAL // NIOT-MoES';
    return 'HYDROGRAPHIC COMMAND';
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#020617] text-slate-200 font-mono select-none">
      {/* Collapsible Left Sidebar */}
      <aside
        className={`relative flex flex-col justify-between bg-[#0b1329] border-r border-[#1e293b] transition-all duration-300 z-30 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Top Header / Branding */}
        <div>
          <div className="flex items-center justify-between p-3.5 border-b border-[#1e293b] bg-[#070e20]">
            <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden group">
              <div className="relative flex items-center justify-center w-7 h-7 rounded-sm bg-[#06b6d4] text-[#0b1329] font-black shrink-0 shadow-sm shadow-cyan-500/20">
                <Radio className="w-4 h-4 text-[#0b1329]" />
                <div className="absolute inset-0 rounded-sm border border-cyan-300 animate-ping opacity-40" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold tracking-tighter text-white flex items-center gap-1 uppercase">
                    SONAR-AI
                    <span className="text-[9px] px-1 py-0.2 bg-cyan-950/80 border border-cyan-800 text-cyan-400 font-mono rounded-xs">
                      v2.1
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 tracking-wider truncate">
                    NIOT // MoES INDIA
                  </div>
                </div>
              )}
            </Link>

            <button
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              className="text-slate-400 hover:text-cyan-300 p-1 hover:bg-[#111d38] border border-transparent hover:border-slate-700 rounded-xs transition-colors"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-1 mt-2">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href === '/dashboard' && pathname === '/') ||
                (item.href === '/surveys' && pathname?.startsWith('/surveys/'));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xs text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-950/80 text-cyan-300 border-l-2 border-cyan-400 shadow-sm'
                      : 'text-slate-400 hover:bg-[#111d38] hover:text-slate-200'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Operational Status Box in Sidebar */}
        <div className="p-3 border-t border-[#1e293b] bg-[#070e20] text-[10px] space-y-2">
          {!collapsed ? (
            <>
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  CUDA-0 READY
                </span>
                <span className="text-slate-500 font-mono-tabular">455 kHz</span>
              </div>
              <div className="text-slate-400 space-y-1 border-t border-slate-800 pt-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">MODEL:</span>
                  <span className="text-cyan-300 font-bold">YOLOv8s-Sonar v2.1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">PIPELINE:</span>
                  <span className="text-emerald-400 font-bold">SYSTEM ONLINE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">AGENCY:</span>
                  <span className="text-slate-300">MoES / NIOT-SIH</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="System Online" />
              <Terminal className="w-3.5 h-3.5 text-slate-500" />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Persistent Top Telemetry Header */}
        <header className="flex items-center justify-between h-12 px-4 bg-[#0b1329] border-b border-[#1e293b] z-20 shrink-0">
          {/* Breadcrumb & Navigation telemetry */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 text-xs">
              <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-bold text-white tracking-wider truncate">
                {getBreadcrumb()}
              </span>
            </div>
            <div className="h-4 w-px bg-[#1e293b] hidden md:block" />
            <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="text-cyan-400 font-bold">MISSION:</span>
                <span className="text-slate-200">BAY_OF_BENGAL_088</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-cyan-400 font-bold">SWATH:</span>
                <span className="text-cyan-300 font-mono-tabular">100.0M (±50m)</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                SYSTEM ONLINE
              </span>
            </div>
          </div>

          {/* Right Header: Hydrographic Clock + Alerts Tray + Status LEDs */}
          <div className="flex items-center gap-4 text-xs">
            {/* UTC Hydrographic Clock */}
            <div className="text-right">
              <div className="text-white text-[11px] font-bold leading-none mb-0.5 font-mono-tabular tracking-wider">
                {utcTime || '14:22:18.42 UTC'}
              </div>
              <div className="text-[9px] text-slate-500 uppercase tracking-widest">
                {julianDate || 'HYDROGRAPHIC CLOCK'}
              </div>
            </div>

            {/* LED Status Indicators */}
            <div className="flex gap-1 items-center px-1" title="Subsystem Link Status">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Sonar Stream Active" />
              <div className="w-2 h-2 rounded-full bg-cyan-400" title="GPU Link Active" />
              <div className="w-2 h-2 rounded-full bg-slate-700" title="Telemetry Standby" />
            </div>

            {/* System Alert Tray */}
            <div className="relative">
              <button
                onClick={() => setAlertOpen(!alertOpen)}
                className="flex items-center gap-1.5 px-2 py-1 bg-[#111d38] hover:bg-slate-800 border border-slate-700 hover:border-cyan-600 rounded-xs text-xs text-slate-200 transition-colors"
              >
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">ALERTS</span>
                <span className="px-1 py-0.2 bg-red-950 border border-red-700 text-red-400 font-bold text-[10px] rounded-xs">
                  2
                </span>
              </button>

              {/* Alert Tray Popover */}
              {alertOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#0b1329] border border-[#1e293b] shadow-2xl rounded-xs p-3 z-50 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      CRITICAL ANOMALY ALERTS
                    </span>
                    <button
                      onClick={() => setAlertOpen(false)}
                      className="text-xs text-slate-400 hover:text-slate-200"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 bg-red-950/40 border border-red-800/80 rounded-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-red-300">HAZ-2026-001 [CRITICAL]</span>
                        <span className="text-[10px] text-slate-400">14:24Z</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Shipwreck hull detected at 13.0942°N, 80.3248°E. Relief height: 2.8m. Flagged for diver team.
                      </p>
                    </div>

                    <div className="p-2 bg-amber-950/40 border border-amber-800/80 rounded-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300">HAZ-2026-002 [HIGH]</span>
                        <span className="text-[10px] text-slate-400">14:25Z</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Ghost net clump entangled at 13.1018°N, 80.3321°E. Navigation snag risk.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-[#020617]">
          {children}
        </main>

        {/* Global Persistent Tactical Footer */}
        <footer className="h-8 px-4 bg-[#0b1329] border-t border-[#1e293b] flex items-center justify-between text-[10px] text-slate-400 shrink-0 select-none tracking-wider">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <span className="text-slate-500 uppercase">NODE:</span>
              <span className="text-emerald-400 font-bold">ONLINE [CUDA-0]</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-2">
              <span className="text-slate-500 uppercase">MODEL:</span>
              <span className="text-white font-bold">YOLOv8s-Sonar v2.1</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-2">
              <span className="text-slate-500 uppercase">AGENCY:</span>
              <span className="text-cyan-300">MoES / NIOT-SIH 26057</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="text-slate-500 uppercase">PIPELINE:</span>
              <span className="text-cyan-400 font-bold">ACTIVE & SYNCHRONIZED</span>
            </span>
            <div className="h-3 w-px bg-[#1e293b]" />
            <span className="text-slate-500">V2.4.0-STABLE</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default ShellLayout;
