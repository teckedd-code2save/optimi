import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard,
  Link2,
  Compass,
  Calendar,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Link2, label: 'Extract', path: '/extract' },
  { icon: Compass, label: 'Finder', path: '/finder' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: Sparkles, label: 'AI Assistant', path: '/assistant' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const width = collapsed ? 'w-16' : 'w-[240px]';

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-[var(--bg-elevated)] border-r border-[var(--border-default)] z-30 flex flex-col transition-all duration-200 ${width}`}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 h-14 px-4 border-b border-[var(--border-default)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">O</span>
        </div>
        {!collapsed && (
          <span className="font-semibold text-[var(--text-primary)] text-base tracking-tight">
            Optimi
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-2 space-y-1 mt-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 h-9 px-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[var(--accent)] text-[var(--accent-primary)] border-l-[3px] border-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border-l-[3px] border-transparent'
              }`}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-[var(--border-default)]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full h-9 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="ml-2 text-sm">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
