import { Bell } from 'lucide-react';

export function TopBar() {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-[var(--bg-primary)] border-b border-[var(--border-default)] z-40 flex items-center justify-between px-4">
      {/* Left: Logo + Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center">
          <span className="text-white font-bold text-sm">O</span>
        </div>
        <span className="font-semibold text-[var(--text-primary)] text-base tracking-tight">
          Optimi
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
          <Bell className="w-[18px] h-[18px]" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center">
          <span className="text-xs font-medium text-[var(--text-secondary)]">U</span>
        </div>
      </div>
    </header>
  );
}
