import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  LayoutDashboard,
  Link2,
  Compass,
  Calendar,
  MoreHorizontal,
} from 'lucide-react';
import { MobileDrawer } from './MobileDrawer';

const tabs = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Link2, label: 'Extract', path: '/extract' },
  { icon: Compass, label: 'Finder', path: '/finder' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
];

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-card)] border-t border-[var(--border-default)] z-40 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-lg transition-colors ${
                isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => setDrawerOpen(true)}
          className={`flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-lg transition-colors ${
            drawerOpen ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
