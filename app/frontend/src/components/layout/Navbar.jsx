import { useTheme } from '../../hooks/useTheme';
import { Moon, Sun, Bell } from 'lucide-react';

export default function Navbar() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <nav className="fixed left-0 right-0 top-0 z-40 flex h-[70px] items-center justify-between border-b border-slate-200 bg-white/95 px-6 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-400 text-lg font-bold text-white">
          S
        </div>
        <span className="hidden text-xl font-bold text-slate-900 dark:text-slate-100 sm:inline">SONAR-AI</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">Live Monitoring</span>
        </div>

        <button className="relative rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" aria-label="Notifications">
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
        </button>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-sky-500/10 dark:text-cyan-300">
          A
        </div>
      </div>
    </nav>
  );
}
