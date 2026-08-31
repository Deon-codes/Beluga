import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Bell, Settings, User, Plus, LayoutDashboard, Target, FileText, History, Radar } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: '+ New Survey', path: '/new-survey', icon: Plus, accent: true },
  { label: 'Detections', path: '/detections', icon: Target },
  { label: 'Reports', path: '/reports', icon: FileText },
  { label: 'History', path: '/history', icon: History },
];

function pad(n) {
  return String(n).padStart(2, '0');
}

export default function Navbar() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return (
    <nav className="fixed left-0 right-0 top-0 z-40 h-16 border-b border-cyan-400/15 bg-[#050a14]/90 px-4 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/50 text-cyan-300 shadow-[0_0_16px_rgba(0,210,255,0.35)]">
              <Radar size={16} />
            </div>
            <span className="text-lg font-bold tracking-wide text-cyan-300">SONAR-AI</span>
          </div>
          <div className="hidden items-center gap-4 text-[10px] uppercase tracking-[0.18em] text-slate-400 lg:flex">
            <span>Current Date: <span className="text-slate-200">{date}</span></span>
            <span>System Time: <span className="text-slate-200">{time}</span></span>
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto md:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-2 py-1 text-xs ${isActive ? 'text-cyan-300' : 'text-slate-400'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm transition ${
                  item.accent
                    ? `border border-cyan-400/50 text-cyan-200 ${isActive ? 'bg-cyan-400/15 shadow-[0_0_18px_rgba(0,210,255,0.25)]' : 'hover:bg-cyan-400/10'}`
                    : isActive
                      ? 'text-cyan-300 shadow-[inset_0_-2px_0_#00d2ff]'
                      : 'text-slate-400 hover:text-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="live-dot h-2 w-2 rounded-full bg-emerald-400" />
            LIVE
          </div>
          <button className="relative rounded-lg p-2 text-slate-300 hover:bg-white/5" aria-label="Notifications">
            <Bell size={16} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>
          <NavLink to="/settings" className="hidden items-center gap-1 text-slate-400 hover:text-white sm:flex">
            <Settings size={15} /> Settings
          </NavLink>
          <NavLink to="/profile" className="hidden items-center gap-1 text-slate-400 hover:text-white sm:flex">
            <User size={15} /> Profile
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
