import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, X, LayoutDashboard, History, Plus, Target, FileText, Settings, User } from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'history', label: 'Survey History', icon: History, path: '/history' },
  { id: 'new-survey', label: 'New Survey', icon: Plus, path: '/new-survey' },
  { id: 'detections', label: 'Detections', icon: Target, path: '/detections' },
  { id: 'reports', label: 'Reports', icon: FileText, path: '/reports' },
];

const bottomItems = [
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="fixed left-4 top-[15px] z-50 rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-md transition-colors hover:bg-slate-100 md:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        aria-label="Toggle Navigation Menu"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Container */}
      <aside
        className={`fixed left-0 top-[70px] z-40 h-[calc(100vh-70px)] w-[280px] overflow-y-auto border-r border-slate-200 bg-white/95 backdrop-blur-sm transition-transform duration-300 dark:border-slate-700 dark:bg-slate-900/95 ${
          !isOpen ? '-translate-x-full md:translate-x-0' : 'translate-x-0'
        } md:translate-x-0`}
      >
        <nav className="flex h-full flex-col p-4">
          <div className="mb-6 hidden md:block">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-400 font-bold text-white">
                S
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">SONAR-AI</span>
            </div>
            <div className="mt-4 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          <div className="flex-1 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all ${
                    active
                      ? 'border-l-2 border-blue-600 bg-blue-50 font-semibold text-blue-700 dark:border-cyan-400 dark:bg-slate-800 dark:text-cyan-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="my-4 h-px bg-slate-200 dark:bg-slate-700" />

          <div className="space-y-1">
            {bottomItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all ${
                    active
                      ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-slate-800 dark:text-cyan-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Backdrop for Mobile Menu */}
      {isOpen && (
        <div
          className="fixed inset-0 top-[70px] z-30 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

