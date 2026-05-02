import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  User,
  Lock,
  CheckCircle2,
  Bell,
  Palette,
  Sun,
  Moon,
  Monitor,
  Smartphone,
  X,
  Database,
  Download,
  Upload,
  Trash2,
  Info,
  BookOpen,
  Bug,
  MessageSquare,
  Server,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const springEase = [0.16, 1, 0.3, 1] as [number, number, number, number];

export function Settings() {
  const { opportunities, settings, updateSettings, importOpportunities, resetToDefaults, extractHistory } =
    useAppStore();
  const [browserNotifEnabled, setBrowserNotifEnabled] = useState(false);
  const [pwaDismissed, setPwaDismissed] = useState(() => {
    return localStorage.getItem('optimi-pwa-dismissed') === 'true';
  });
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Capture PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Check browser notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setBrowserNotifEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleConnectGoogle = useCallback(() => {
    toast.info('Google Calendar integration is coming soon. For now, use Export .ics in the Calendar page.');
  }, []);

  const handleDisconnectGoogle = useCallback(() => {
    updateSettings({ googleConnected: false, googleEmail: null, calendarSync: false });
    toast.success('Settings cleared');
  }, [updateSettings]);

  const handleThemeChange = useCallback(
    (theme: 'light' | 'dark' | 'auto') => {
      updateSettings({ theme });
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        // Auto: check system preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
      toast.success(`Theme set to ${theme}`);
    },
    [updateSettings]
  );

  const handleExportData = useCallback(() => {
    const data = {
      opportunities,
      settings,
      extractHistory,
      exportedAt: new Date().toISOString(),
      version: '2.0.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimi-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Data exported — import this file on your other device to sync');
  }, [opportunities, settings, extractHistory]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          let importedCount = 0;

          if (Array.isArray(data.opportunities)) {
            importOpportunities(data.opportunities);
            importedCount = data.opportunities.length;
          } else if (Array.isArray(data)) {
            importOpportunities(data);
            importedCount = data.length;
          }

          if (data.settings && typeof data.settings === 'object') {
            updateSettings(data.settings);
          }

          toast.success(`Imported ${importedCount} opportunities${data.settings ? ' + settings' : ''}`);
        } catch {
          toast.error('Failed to parse JSON');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [importOpportunities, updateSettings]
  );

  const handleClearData = useCallback(() => {
    importOpportunities([]);
    toast.success('All data cleared');
  }, [importOpportunities]);

  const handleResetDefaults = useCallback(() => {
    resetToDefaults();
    toast.success('Reset to defaults');
  }, [resetToDefaults]);

  const handleRequestNotifPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications not supported');
      return;
    }
    const result = await Notification.requestPermission();
    setBrowserNotifEnabled(result === 'granted');
    if (result === 'granted') {
      toast.success('Browser notifications enabled');
    } else {
      toast.error('Notification permission denied');
    }
  }, []);

  const handlePWAInstall = useCallback(async () => {
    if (!deferredPrompt.current) {
      toast.info('To install: use your browser menu > "Add to Home Screen"');
      return;
    }
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === 'accepted') {
      toast.success('Optimi installed');
    }
    deferredPrompt.current = null;
  }, []);

  const handleDismissPWA = useCallback(() => {
    setPwaDismissed(true);
    localStorage.setItem('optimi-pwa-dismissed', 'true');
  }, []);

  const sectionCard = 'bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 lg:p-6 mb-4';

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: springEase }}
        className="mb-6"
      >
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-[var(--accent-primary)]" />
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Settings</h1>
        </div>
      </motion.div>

      {/* Account & Sync */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: springEase }}
        className={sectionCard}
      >
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-[var(--text-tertiary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Account &amp; Sync</h2>
        </div>

        {settings.googleConnected ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-[var(--bg-elevated)] rounded-xl p-4 flex items-center gap-3.5 mb-4"
          >
            <div className="w-11 h-11 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-[var(--accent-primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text-tertiary)]">Signed in as</p>
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {settings.googleEmail}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-xs text-emerald-600">Calendar connected</span>
              </div>
            </div>
            <button
              onClick={handleDisconnectGoogle}
              className="text-xs text-rose-500 hover:text-rose-600 font-medium px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
            >
              Disconnect
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-[var(--bg-elevated)] rounded-xl p-6 text-center mb-4"
          >
            <Lock className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
              Google Calendar Sync
            </p>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Sync deadlines with Google Calendar and get reminders. Coming soon.
            </p>
            <button onClick={handleConnectGoogle} className="btn-secondary text-sm inline-flex items-center gap-2 opacity-60 cursor-not-allowed" disabled>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Coming Soon
            </button>
          </motion.div>
        )}

        <div className="space-y-0">
          <div className="flex items-center justify-between py-3.5 border-t border-[var(--border-subtle)]">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Push to Google Calendar
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Sync your opportunity deadlines to Google Calendar
              </p>
            </div>
            <Switch
              checked={settings.calendarSync}
              onCheckedChange={(checked: boolean) => updateSettings({ calendarSync: checked })}
              disabled={!settings.googleConnected}
              className="data-[state=checked]:bg-[var(--accent-primary)]"
            />
          </div>
        </div>
      </motion.section>

      {/* Notifications */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.08, ease: springEase }}
        className={sectionCard}
      >
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-[var(--text-tertiary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Notifications</h2>
        </div>

        <div className="space-y-0">
          <div className="flex items-center justify-between py-3.5 border-b border-[var(--border-subtle)]">
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Deadline Reminders
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Get reminded about upcoming deadlines
              </p>
            </div>
            <Switch
              checked={settings.deadlineReminders}
              onCheckedChange={(checked: boolean) => updateSettings({ deadlineReminders: checked })}
              className="data-[state=checked]:bg-[var(--accent-primary)]"
            />
          </div>

          {settings.deadlineReminders && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.2 }}
              className="py-3 border-b border-[var(--border-subtle)]"
            >
              <label className="block text-xs text-[var(--text-tertiary)] mb-1.5">
                Reminder Days
              </label>
              <select
                value={settings.reminderDays}
                onChange={(e) => updateSettings({ reminderDays: Number(e.target.value) })}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-all"
              >
                <option value={1}>1 day before</option>
                <option value={3}>3 days before</option>
                <option value={7}>7 days before</option>
                <option value={14}>14 days before</option>
              </select>
            </motion.div>
          )}

          <div className="flex items-center justify-between py-3.5">
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Browser Notifications
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {browserNotifEnabled
                  ? 'Permission granted'
                  : 'Click to enable browser push notifications'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {browserNotifEnabled ? (
                <span className="text-xs text-emerald-600 font-medium">Granted</span>
              ) : (
                <button
                  onClick={handleRequestNotifPermission}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Enable
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Backend & AI */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1, ease: springEase }}
        className={sectionCard}
      >
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-[var(--text-tertiary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Backend &amp; AI</h2>
        </div>

        <div className="space-y-0">
          <div className="py-3.5 border-b border-[var(--border-subtle)]">
            <label className="block text-xs text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wide font-medium">
              Scraper Backend URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={settings.backendUrl}
                onChange={(e) => updateSettings({ backendUrl: e.target.value })}
                placeholder="https://api.yourdomain.com or http://localhost:8000"
                className="flex-1 px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-all"
              />
              <button
                onClick={async () => {
                  if (!settings.backendUrl) {
                    toast.info('Enter a backend URL first');
                    return;
                  }
                  const base = settings.backendUrl.replace(/\/$/, '');
                  try {
                    const healthRes = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
                    if (!healthRes.ok) {
                      toast.error('Backend unreachable');
                      return;
                    }
                    toast.success('Backend connected');

                    if (settings.aiEnabled) {
                      const aiRes = await fetch(`${base}/api/ai/status`, { signal: AbortSignal.timeout(5000) });
                      if (aiRes.ok) {
                        const aiData = await aiRes.json();
                        if (aiData.configured) {
                          toast.success('AI is ready');
                        } else {
                          toast.warning('AI not configured on backend — add OPENAI_API_KEY');
                        }
                      }
                    }
                  } catch {
                    toast.error('Backend unreachable');
                  }
                }}
                className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Test
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5">
              Optional. Leave empty to use client-side extraction only.
              For full scraping power, run the Python backend on your Hetzner VPS.
            </p>
          </div>

          <div className="flex items-center justify-between py-3.5">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                AI-Powered Generation
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Use OpenAI via backend for smarter drafts
              </p>
            </div>
            <Switch
              checked={settings.aiEnabled}
              onCheckedChange={(checked: boolean) => updateSettings({ aiEnabled: checked })}
              disabled={!settings.backendUrl}
              className="data-[state=checked]:bg-[var(--accent-primary)]"
            />
          </div>

          {settings.backendUrl && settings.aiEnabled && (
            <div className="flex items-center gap-1.5 py-2">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span className="text-xs text-[var(--text-secondary)]">
                AI Assistant will call your backend when generating drafts.
              </span>
            </div>
          )}
        </div>
      </motion.section>

      {/* Appearance */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.12, ease: springEase }}
        className={sectionCard}
      >
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-[var(--text-tertiary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Appearance</h2>
        </div>

        <label className="block text-xs text-[var(--text-tertiary)] mb-2.5 uppercase tracking-wide font-medium">
          Theme
        </label>
        <div className="flex gap-3 mb-5">
          {([
            { value: 'light' as const, label: 'Light', icon: Sun },
            { value: 'dark' as const, label: 'Dark', icon: Moon },
            { value: 'auto' as const, label: 'Auto', icon: Monitor },
          ]).map((t) => (
            <button
              key={t.value}
              onClick={() => handleThemeChange(t.value)}
              className={`flex-1 max-w-[120px] flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                settings.theme === t.value
                  ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)]'
                  : 'border-transparent bg-[var(--bg-elevated)] hover:border-[var(--border-default)]'
              }`}
            >
              <t.icon
                className={`w-5 h-5 ${
                  settings.theme === t.value
                    ? 'text-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              />
              <span className="text-xs font-medium text-[var(--text-primary)]">{t.label}</span>
              <div
                className="w-10 h-7 rounded-md border border-[var(--border-default)]"
                style={
                  t.value === 'light'
                    ? { background: '#fafaf9' }
                    : t.value === 'dark'
                      ? { background: '#1c1917' }
                      : { background: 'linear-gradient(to right, #fafaf9 50%, #1c1917 50%)' }
                }
              />
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between py-3.5 border-t border-[var(--border-subtle)]">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Compact Mode</p>
            <p className="text-xs text-[var(--text-secondary)]">Smaller cards, denser layout</p>
          </div>
          <Switch
            checked={settings.compactMode}
            onCheckedChange={(checked: boolean) => updateSettings({ compactMode: checked })}
            className="data-[state=checked]:bg-[var(--accent-primary)]"
          />
        </div>

        <div className="flex items-center justify-between py-3.5 border-t border-[var(--border-subtle)]">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Enable Animations</p>
            <p className="text-xs text-[var(--text-secondary)]">Page transitions and micro-interactions</p>
          </div>
          <Switch
            checked={settings.enableAnimations}
            onCheckedChange={(checked: boolean) => updateSettings({ enableAnimations: checked })}
            className="data-[state=checked]:bg-[var(--accent-primary)]"
          />
        </div>

        {/* PWA Install Card */}
        {!pwaDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.15, ease: springEase }}
            className="mt-4 bg-[#e0e7ff] border border-[rgba(79,70,229,0.15)] rounded-xl p-4 flex items-center gap-4 relative"
          >
            <button
              onClick={handleDismissPWA}
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
            >
              <X className="w-3 h-3 text-[var(--text-tertiary)]" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
              <Smartphone className="w-6 h-6 text-[var(--accent-primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Install Optimi</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Add to your home screen for quick access
              </p>
            </div>
            <button onClick={handlePWAInstall} className="btn-primary text-xs px-3 py-2 shrink-0">
              Install
            </button>
          </motion.div>
        )}
      </motion.section>

      {/* Data & Privacy */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.16, ease: springEase }}
        className={sectionCard}
      >
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-[var(--text-tertiary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Data &amp; Privacy</h2>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="space-y-0">
          <div className="flex items-center justify-between py-3.5 border-b border-[var(--border-subtle)]">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Export Data</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Download all your opportunities and notes as JSON
              </p>
            </div>
            <button
              onClick={handleExportData}
              className="btn-secondary text-sm flex items-center gap-1.5 px-3 py-2"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
          </div>

          <div className="flex items-center justify-between py-3.5 border-b border-[var(--border-subtle)]">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Import Data</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Restore from a previous JSON export
              </p>
            </div>
            <button
              onClick={handleImportClick}
              className="btn-secondary text-sm flex items-center gap-1.5 px-3 py-2"
            >
              <Upload className="w-3.5 h-3.5" />
              Import JSON
            </button>
          </div>

          <div className="flex items-center justify-between py-3.5 border-b border-[var(--border-subtle)]">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Reset to Defaults</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Restore default settings and sample data
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="btn-ghost text-sm px-3 py-2">Reset</button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset to defaults?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will restore the default settings and sample opportunities. Your custom data
                    will be preserved unless you choose to clear it separately.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetDefaults}>Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex items-center justify-between py-3.5">
            <div>
              <p className="text-sm font-medium text-rose-500">Clear All Data</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Permanently delete all your data from this device
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 text-rose-500 text-sm font-medium hover:bg-rose-50 hover:border-rose-300 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Data
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove all your opportunities, notes, and settings. This
                    cannot be undone. Make sure you&apos;ve exported your data if you want to keep it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearData}
                    className="bg-rose-500 text-white hover:bg-rose-600"
                  >
                    Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </motion.section>

      {/* About */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.2, ease: springEase }}
        className={`${sectionCard} mb-8`}
      >
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-[var(--text-tertiary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">About</h2>
        </div>

        <div className="mb-4">
          <p className="text-base font-semibold text-[var(--text-primary)]">Optimi</p>
          <p className="text-sm text-[var(--text-secondary)]">Your personal opportunity tracker</p>
          <p className="text-xs font-mono text-[var(--text-tertiary)] mt-1">Version 2.0.0</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); toast.info('Documentation coming soon'); }}
            className="btn-secondary text-sm flex items-center gap-1.5 px-3 py-2"
          >
            <BookOpen className="w-3.5 h-3.5" />
            How to Use
          </a>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); toast.info('Report issues at github.com/optimi/issues'); }}
            className="btn-secondary text-sm flex items-center gap-1.5 px-3 py-2"
          >
            <Bug className="w-3.5 h-3.5" />
            Report Bug
          </a>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); toast.info('Feedback coming soon'); }}
            className="btn-secondary text-sm flex items-center gap-1.5 px-3 py-2"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Feedback
          </a>
        </div>

        <p className="text-xs text-[var(--text-tertiary)] italic">
          Built with care for builders and dreamers.
        </p>
      </motion.section>
    </div>
  );
}
