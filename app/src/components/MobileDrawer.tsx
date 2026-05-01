import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Sparkles, Settings, X } from 'lucide-react';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative bg-[var(--bg-card)] rounded-t-[20px] max-h-[70vh] flex flex-col animate-fade-slide-up">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[var(--text-muted)]" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Items */}
        <div className="px-4 pb-8 space-y-1">
          <button
            onClick={() => handleNavigate('/assistant')}
            className="flex items-center gap-3 w-full h-12 px-3 rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
          >
            <Sparkles className="w-5 h-5 text-[var(--text-secondary)]" />
            <span className="font-medium text-sm">AI Assistant</span>
          </button>

          <div className="h-px bg-[var(--border-default)] my-1" />

          <button
            onClick={() => handleNavigate('/settings')}
            className="flex items-center gap-3 w-full h-12 px-3 rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
          >
            <Settings className="w-5 h-5 text-[var(--text-secondary)]" />
            <span className="font-medium text-sm">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
