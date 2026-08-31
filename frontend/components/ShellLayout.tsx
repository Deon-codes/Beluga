'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UploadCloud,
  FolderArchive,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Bell,
  Activity,
  Menu,
} from 'lucide-react';

interface ShellLayoutProps {
  children: React.ReactNode;
}

export function ShellLayout({ children }: ShellLayoutProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Upload Survey', href: '/surveys/new', icon: UploadCloud },
    { label: 'Surveys', href: '/surveys', icon: FolderArchive },
    { label: 'Detections', href: '/detections', icon: Search },
    { label: 'Reports', href: '/reports', icon: FileText },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8fafc] dark:bg-[#09090b] text-slate-900 dark:text-slate-100 selection:bg-primary-100 selection:text-primary-900">
      {/* Sidebar */}
      <aside
        className={`relative flex flex-col justify-between bg-white dark:bg-zinc-950 border-r border-slate-200/60 dark:border-zinc-800/80 transition-all duration-300 z-30 shadow-sm ${
          collapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 pb-4">
            <Link href="/dashboard" className="flex items-center gap-4 overflow-hidden group">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md shadow-primary-500/20 shrink-0 transition-transform group-hover:scale-105">
                <Activity className="w-5 h-5" />
              </div>
              {!collapsed && (
                <div className="min-w-0 transition-opacity duration-300">
                  <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight">Beluga</h1>
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Marine Intelligence</p>
                </div>
              )}
            </Link>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 shadow-sm shadow-primary-500/5'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-zinc-900/50 dark:hover:text-slate-200'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-400'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-slate-200/60 dark:border-zinc-800/80">
            <button
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              className="flex items-center justify-center w-full p-2 text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg transition-colors"
            >
              {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between h-16 px-8 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg border-b border-slate-200/60 dark:border-zinc-800/80 z-20 shrink-0 sticky top-0">
          <div className="flex items-center gap-4 min-w-0">
            {collapsed && (
              <button 
                onClick={() => setCollapsed(false)}
                className="lg:hidden text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white capitalize">
              {pathname?.split('/')[1] || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-5">
            <div className="relative">
              <button
                onClick={() => setAlertOpen(!alertOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors relative group"
              >
                <Bell className="w-5 h-5 text-slate-500 dark:text-zinc-400 group-hover:text-slate-700 dark:group-hover:text-zinc-300 transition-colors" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-zinc-950 shadow-sm" />
              </button>

              {alertOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 shadow-xl shadow-slate-200/20 dark:shadow-black/40 rounded-2xl p-5 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-4 mb-4">
                    <span className="text-sm font-semibold flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                      Notifications
                    </span>
                    <button
                      onClick={() => setAlertOpen(false)}
                      className="text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl space-y-1.5 transition-colors hover:bg-red-100 dark:hover:bg-red-500/15 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-red-700 dark:text-red-400">Critical Anomaly</span>
                        <span className="text-xs font-medium text-red-500/70 dark:text-red-400/70">Just now</span>
                      </div>
                      <p className="text-sm text-red-800/80 dark:text-red-300/80 leading-relaxed">
                        Shipwreck hull detected at 13.0942°N, 80.3248°E. Relief height: 2.8m.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary-400 to-primary-600 border-2 border-white dark:border-zinc-950 shadow-sm cursor-pointer hover:scale-105 transition-transform" />
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default ShellLayout;
