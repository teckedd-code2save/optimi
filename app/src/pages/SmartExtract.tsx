import { useState, useRef, useEffect, useCallback } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import type { ParsedOpportunity, Opportunity, OpportunityType, ExtractHistoryItem } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { PARSERS } from '@/lib/parsers/index';
import { scrapeUrl } from '@/lib/api';
import { TypeBadge } from '@/components/TypeBadge';
import { DeadlineBadge } from '@/components/DeadlineBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Link2,
  Link,
  Zap,
  ClipboardPaste,
  Globe,
  Linkedin,
  Twitter,
  Code2,
  Check,
  ExternalLink,
  Plus,
  RefreshCw,
  ChevronRight,
  Paperclip,
  AlertTriangle,
  Edit3,
  Save,
  CheckCircle2,
  Calendar,
  Trophy,
  MapPin,
  Tag,
  Building2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface LogLine {
  id: number;
  icon: 'start' | 'processing' | 'success' | 'warning' | 'error' | 'data';
  message: string;
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const easeSpring = [0.16, 1, 0.3, 1] as [number, number, number, number];

function getTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function detectParserName(url: string): string {
  const parser = PARSERS.find((p) => p.canParse(url));
  return parser?.name ?? 'generic';
}

function parserDisplayInfo(name: string): { label: string; icon: React.ReactNode } {
  switch (name) {
    case 'linkedin':
      return { label: 'LinkedIn', icon: <Linkedin size={14} /> };
    case 'twitter':
      return { label: 'X / Twitter', icon: <Twitter size={14} /> };
    case 'devpost':
      return { label: 'Devpost', icon: <Code2 size={14} /> };
    case 'googleForms':
      return { label: 'Google Forms', icon: <Globe size={14} /> };
    case 'known-url':
      return { label: 'Known URL', icon: <CheckCircle2 size={14} /> };
    default:
      return { label: 'Generic', icon: <Globe size={14} /> };
  }
}

const LOG_ICONS: Record<LogLine['icon'], string> = {
  start: '\u25B6',
  processing: '\u203A',
  success: '\u2713',
  warning: '\u26A0',
  error: '\u2717',
  data: '\u2192',
};

const LOG_COLORS: Record<LogLine['icon'], string> = {
  start: '#a8a29e',
  processing: '#6b7280',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#f43f5e',
  data: '#4f46e5',
};

async function pushLog(
  setLogs: React.Dispatch<React.SetStateAction<LogLine[]>>,
  icon: LogLine['icon'],
  message: string,
  delayMs = 180
) {
  await new Promise((r) => setTimeout(r, delayMs));
  setLogs((prev) => [...prev, { id: prev.length + 1, icon, message, timestamp: getTimestamp() }]);
}

function confidenceLabel(score: number): { label: string; color: string } {
  if (score >= 0.8) return { label: 'High confidence', color: 'var(--accent-success)' };
  if (score >= 0.5) return { label: 'Medium confidence', color: 'var(--accent-warning)' };
  return { label: 'Low confidence — please review', color: 'var(--accent-danger)' };
}

function generateChecklist(type: OpportunityType | null): string[] {
  switch (type) {
    case 'hackathon':
      return ['Register on event platform', 'Read rules and eligibility', 'Form or join a team', 'Submit application before deadline', 'Prepare project presentation', 'Submit final project'];
    case 'accelerator':
      return ['Review program requirements', 'Prepare pitch deck', 'Submit application', 'Follow up with program coordinators', 'Prepare for interviews'];
    case 'grant':
      return ['Review eligibility criteria', 'Gather required documents', 'Draft proposal', 'Submit application before deadline', 'Track application status'];
    case 'job':
      return ['Review job requirements', 'Tailor CV/resume', 'Write cover letter', 'Submit application', 'Follow up with recruiter'];
    case 'government':
      return ['Review eligibility requirements', 'Gather identification documents', 'Complete application form', 'Pay any required fees', 'Submit before deadline'];
    case 'platform':
      return ['Review platform requirements', 'Create account if needed', 'Complete onboarding steps', 'Submit application', 'Integrate with platform'];
    default:
      return ['Review details', 'Gather required information', 'Follow up as needed'];
  }
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export function SmartExtract() {
  const [url, setUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ParsedOpportunity | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Opportunity>>({});
  const [checklist, setChecklist] = useState<string[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addOpportunity = useAppStore((s) => s.addOpportunity);
  const addExtractHistory = useAppStore((s) => s.addExtractHistory);
  const extractHistory = useAppStore((s) => s.extractHistory);

  /* auto-scroll log */
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  /* ---------------------------------------------------------------- */
  /*  Extraction Logic                                                */
  /* ---------------------------------------------------------------- */
  const runExtraction = useCallback(async (inputUrl: string) => {
    if (!inputUrl.trim()) return;

    setIsExtracting(true);
    setResult(null);
    setIsEditing(false);
    setLogs([]);
    setProgress(0);
    setCheckedItems(new Set());

    const parserName = detectParserName(inputUrl);
    const domain = (() => { try { return new URL(inputUrl).hostname; } catch { return inputUrl; } })();

    // Step 1: init
    await pushLog(setLogs, 'start', `Initializing parser for ${domain}...`);
    setProgress(10);

    // Step 2: match parser
    await pushLog(setLogs, 'data', `Matched ${parserDisplayInfo(parserName).label} parser`);
    setProgress(25);

    // Step 3: run extraction
    const { settings } = useAppStore.getState();
    const parser = PARSERS.find((p) => p.canParse(inputUrl));
    let parsed: ParsedOpportunity;

    try {
      if (settings.backendUrl) {
        // Use Python backend for full scraping power
        await pushLog(setLogs, 'processing', 'Sending to backend scraper...');
        parsed = await scrapeUrl(settings.backendUrl, inputUrl);
        await pushLog(setLogs, 'success', `Backend extraction complete (${parsed.parserUsed})`);
      } else if (parserName === 'known-url') {
        await pushLog(setLogs, 'success', 'Full metadata match from curated database');
        parsed = await parser!.parse(inputUrl);
      } else if (parserName === 'generic') {
        await pushLog(setLogs, 'processing', 'Fetching page via CORS proxy...');
        parsed = await parser!.parse(inputUrl);
        if (parsed.parserUsed === 'generic-fallback') {
          await pushLog(setLogs, 'warning', 'Page blocked by CORS — using URL fallback');
        } else {
          await pushLog(setLogs, 'success', `Extracted ${parsed.title ? 'title' : ''}${parsed.title && parsed.description ? ' + ' : ''}${parsed.description ? 'description' : ''} from HTML`);
        }
      } else {
        // LinkedIn, Twitter, Devpost, Google Forms — URL-based only
        await pushLog(setLogs, 'processing', 'Parsing URL structure...');
        parsed = await parser!.parse(inputUrl);
        await pushLog(setLogs, 'warning', 'Client-side extraction — limited to URL metadata');
      }
    } catch (err) {
      await pushLog(setLogs, 'error', `Extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      parsed = {
        title: null,
        organization: null,
        type: null,
        description: null,
        deadline: null,
        location: null,
        prizes: null,
        requirements: [],
        url: inputUrl,
        confidence: 0.1,
        parserUsed: 'generic',
      };
    }

    setProgress(90);
    await pushLog(setLogs, 'processing', 'Classifying opportunity type...');
    setProgress(100);
    await pushLog(setLogs, 'success', 'Extraction complete');

    setResult(parsed);
    const autoChecklist = generateChecklist(parsed.type);
    setChecklist(autoChecklist);
    setEditForm({
      title: parsed.title ?? '',
      organization: parsed.organization ?? '',
      type: parsed.type ?? 'other',
      deadline: parsed.deadline ? parsed.deadline.slice(0, 10) : '',
      description: parsed.description ?? '',
      requirements: parsed.requirements.length > 0 ? parsed.requirements : autoChecklist,
      prizes: parsed.prizes ?? '',
      location: parsed.location ?? '',
    });
    setIsExtracting(false);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isExtracting) return;
    runExtraction(url);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      // Auto-trigger after a brief delay
      setTimeout(() => runExtraction(text), 100);
    } catch {
      toast.error('Could not read clipboard');
    }
  };

  const handleAddToTracker = () => {
    if (!result) return;
    const form = isEditing ? editForm : {};
    const opp: Opportunity = {
      id: crypto.randomUUID(),
      title: (form.title ?? result.title ?? 'Untitled Opportunity'),
      organization: (form.organization ?? result.organization ?? 'Unknown'),
      type: (form.type ?? result.type ?? 'other') as OpportunityType,
      status: 'saved',
      url: result.url,
      deadline: (form.deadline ?? result.deadline) || null,
      description: (form.description ?? result.description ?? ''),
      requirements: (form.requirements ?? result.requirements ?? checklist),
      prizes: (form.prizes ?? result.prizes) || undefined,
      location: (form.location ?? result.location) || undefined,
      checklist: checklist.map((text, i) => ({ id: crypto.randomUUID(), text, completed: checkedItems.has(i) })),
      notes: '',
      dateAdded: new Date().toISOString(),
      parsedFrom: result.url,
      extractionConfidence: result.confidence,
    };
    addOpportunity(opp);

    const historyItem: ExtractHistoryItem = {
      url: result.url,
      title: opp.title,
      date: new Date().toISOString(),
      added: true,
    };
    addExtractHistory(historyItem);

    toast.success('Added to tracker!');
    setResult(null);
    setUrl('');
    setLogs([]);
    setProgress(0);
  };

  const handleExtractAnother = () => {
    setResult(null);
    setUrl('');
    setLogs([]);
    setProgress(0);
    setIsEditing(false);
    inputRef.current?.focus();
  };

  const toggleChecklistItem = (index: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const isValidUrl = (() => {
    try { new URL(url); return true; } catch { return url.includes('http'); }
  })();

  return (
    <div className="p-4 lg:p-8 max-w-[720px] mx-auto">
      {/* ============ HEADER ============ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: easeSpring }}
      >
        <div className="flex items-center gap-3 mb-1">
          <Link2 size={28} className="text-[var(--accent-primary)]" />
          <h1 className="text-2xl lg:text-3xl font-semibold text-[var(--text-primary)]">Smart Extract</h1>
        </div>
        <p className="text-[var(--text-secondary)] text-sm lg:text-base max-w-[480px] mb-6">
          Paste a URL and let our parsers do the work
        </p>
      </motion.div>

      {/* ============ URL INPUT ============ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1, ease: easeSpring }}
      >
        <form onSubmit={handleSubmit}>
          <div
            className="bg-[var(--bg-card)] border-2 border-[var(--border-default)] rounded-2xl p-5 shadow-sm transition-all duration-200"
            style={{
              borderColor: isExtracting ? 'var(--accent-warning)' : undefined,
              boxShadow: isExtracting ? '0 0 0 4px rgba(245, 158, 11, 0.08)' : undefined,
            }}
          >
            {/* Input row */}
            <div className="relative">
              <Link
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none"
              />
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                placeholder="https://usaii-global-ai-hackathon-2026.devpost.com/ or https://x.com/..."
                className="w-full h-[52px] pl-12 pr-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                disabled={isExtracting}
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                type="submit"
                disabled={!url.trim() || isExtracting || !isValidUrl}
                className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Zap size={16} />
                {isExtracting ? 'Extracting...' : 'Extract'}
              </button>
              <button
                type="button"
                onClick={handlePaste}
                disabled={isExtracting}
                className="btn-secondary flex items-center justify-center gap-2 flex-1 sm:flex-none disabled:opacity-40"
              >
                <ClipboardPaste size={16} />
                Paste
              </button>
            </div>
          </div>
        </form>

        {/* Parser chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            { key: 'linkedin', label: 'LinkedIn', icon: <Linkedin size={14} /> },
            { key: 'twitter', label: 'X/Twitter', icon: <Twitter size={14} /> },
            { key: 'devpost', label: 'Devpost', icon: <Code2 size={14} /> },
            { key: 'googleForms', label: 'Google Forms', icon: <Globe size={14} /> },
            { key: 'generic', label: 'Generic', icon: <Globe size={14} /> },
          ].map((chip, i) => {
            const isDetected = detectParserName(url) === chip.key;
            const isActive = isDetected && url.trim().length > 0;
            return (
              <motion.div
                key={chip.key}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.15 + i * 0.04 }}
                className={
                  isActive
                    ? 'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border bg-[rgba(79,70,229,0.08)] border-[var(--accent-primary)] text-[var(--accent-primary)]'
                    : 'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border border-[var(--border-default)] text-[var(--text-tertiary)]'
                }
              >
                {chip.icon}
                {chip.label}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ============ TERMINAL LOG ============ */}
      <AnimatePresence>
        {(isExtracting || logs.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 overflow-hidden"
          >
            <div
              className="rounded-xl p-5 font-mono text-xs max-h-[280px] overflow-y-auto"
              style={{
                backgroundColor: '#1c1917',
                border: '1px solid #292524',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {/* Terminal header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f43f5e' }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10b981' }} />
                </div>
                <span className="text-[#57534e] text-[11px]">extraction.log</span>
              </div>

              {/* Log lines */}
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start justify-between leading-[22px]"
                >
                  <span className="flex items-center gap-2">
                    <span style={{ color: LOG_COLORS[log.icon], minWidth: 14 }}>{LOG_ICONS[log.icon]}</span>
                    <span style={{ color: '#d6d3d1' }}>{log.message}</span>
                  </span>
                  <span className="text-[#57534e] text-[10px] ml-4 shrink-0">{log.timestamp}</span>
                </motion.div>
              ))}
              <div ref={logEndRef} />
            </div>

            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: isExtracting ? 'var(--accent-warning)' : 'var(--accent-success)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ RESULT CARD ============ */}
      <AnimatePresence>
        {result && !isExtracting && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.3, ease: easeSpring }}
            className="mt-6"
          >
            <div className="card-optimi p-5 lg:p-6 shadow-md">
              {/* Card header */}
              <div className="flex items-start justify-between mb-4">
                <TypeBadge type={result.type ?? 'other'} />
                <button
                  onClick={() => setIsEditing((v) => !v)}
                  className="btn-ghost flex items-center gap-1.5 text-xs"
                >
                  <Edit3 size={14} />
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {/* Edit form */}
              <AnimatePresence>
                {isEditing ? (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-medium">Title</label>
                      <input
                        type="text"
                        value={editForm.title ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-medium">Organization</label>
                        <input
                          type="text"
                          value={editForm.organization ?? ''}
                          onChange={(e) => setEditForm((f) => ({ ...f, organization: e.target.value }))}
                          className="w-full mt-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-medium">Type</label>
                        <select
                          value={editForm.type ?? 'other'}
                          onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value as OpportunityType }))}
                          className="w-full mt-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                        >
                          <option value="hackathon">Hackathon</option>
                          <option value="accelerator">Accelerator</option>
                          <option value="grant">Grant</option>
                          <option value="government">Government</option>
                          <option value="platform">Platform</option>
                          <option value="job">Job</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-medium">Deadline</label>
                        <input
                          type="date"
                          value={editForm.deadline ?? ''}
                          onChange={(e) => setEditForm((f) => ({ ...f, deadline: e.target.value }))}
                          className="w-full mt-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-medium">Location</label>
                        <input
                          type="text"
                          value={editForm.location ?? ''}
                          onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                          className="w-full mt-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-medium">Prizes / Amount</label>
                      <input
                        type="text"
                        value={editForm.prizes ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, prizes: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-medium">Description</label>
                      <textarea
                        value={editForm.description ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        rows={3}
                        className="w-full mt-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent-primary)] resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-medium">Requirements (comma separated)</label>
                      <input
                        type="text"
                        value={Array.isArray(editForm.requirements) ? editForm.requirements.join(', ') : ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, requirements: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
                        className="w-full mt-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Title */}
                    <h2 className="text-xl lg:text-2xl font-semibold text-[var(--text-primary)] mb-1">
                      {result.title ?? 'Untitled Opportunity'}
                    </h2>
                    {result.organization && (
                      <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] mb-4">
                        <Building2 size={14} />
                        {result.organization}
                      </div>
                    )}

                    {/* Structured data grid */}
                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 mt-4">
                      {result.type && (
                        <>
                          <span className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] justify-end">
                            <Tag size={13} /> Type
                          </span>
                          <span><TypeBadge type={result.type} /></span>
                        </>
                      )}
                      {result.deadline && (
                        <>
                          <span className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] justify-end">
                            <Calendar size={13} /> Deadline
                          </span>
                          <span><DeadlineBadge deadline={result.deadline} /></span>
                        </>
                      )}
                      {result.prizes && (
                        <>
                          <span className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] justify-end">
                            <Trophy size={13} /> Prize
                          </span>
                          <span className="text-sm font-mono text-[var(--text-primary)]">{result.prizes}</span>
                        </>
                      )}
                      {result.location && (
                        <>
                          <span className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] justify-end">
                            <MapPin size={13} /> Location
                          </span>
                          <span className="text-sm text-[var(--text-primary)]">{result.location}</span>
                        </>
                      )}
                      <>
                        <span className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] justify-end">
                          <Link2 size={13} /> Source
                        </span>
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-[var(--accent-primary)] hover:underline truncate flex items-center gap-1"
                        >
                          <ExternalLink size={11} />
                          {result.url.length > 50 ? result.url.slice(0, 50) + '...' : result.url}
                        </a>
                      </>
                    </div>

                    {/* Confidence */}
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-xs text-[var(--text-tertiary)]">Confidence:</span>
                      <div className="flex-1 h-1.5 bg-[var(--bg-elevated)] rounded-full max-w-[120px]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${result.confidence * 100}%`,
                            backgroundColor: confidenceLabel(result.confidence).color,
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium" style={{ color: confidenceLabel(result.confidence).color }}>
                        {confidenceLabel(result.confidence).label}
                      </span>
                    </div>

                    {/* Description */}
                    {result.description && (
                      <p className="mt-4 text-sm text-[var(--text-secondary)] leading-relaxed">
                        {result.description}
                      </p>
                    )}

                    {/* Parser used */}
                    <div className="mt-3 text-xs text-[var(--text-muted)]">
                      Parsed with {parserDisplayInfo(result.parserUsed).label} parser
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Checklist */}
              {checklist.length > 0 && (
                <div className="mt-5 pt-4 border-t border-[var(--border-default)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[var(--text-tertiary)]" />
                    Suggested checklist
                  </h3>
                  <div className="space-y-2">
                    {checklist.map((item, index) => (
                      <motion.label
                        key={index}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04, duration: 0.2 }}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div
                          className={
                            checkedItems.has(index)
                              ? 'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                              : 'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors border-[var(--border-default)] group-hover:border-[var(--accent-primary)]'
                          }
                          onClick={() => toggleChecklistItem(index)}
                        >
                          {checkedItems.has(index) && <Check size={12} className="text-white" />}
                        </div>
                        <span className={checkedItems.has(index) ? 'text-sm text-[var(--text-muted)] line-through' : 'text-sm text-[var(--text-secondary)]'}>
                          {item}
                        </span>
                      </motion.label>
                    ))}
                  </div>
                </div>
              )}

              {/* Action footer */}
              <div className="mt-6 pt-4 border-t border-[var(--border-default)] flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAddToTracker}
                  className="btn-primary flex items-center justify-center gap-2 flex-1"
                >
                  <Plus size={16} />
                  Add to Tracker
                </button>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-secondary flex items-center justify-center gap-2 flex-1 sm:flex-none"
                  >
                    <Edit3 size={16} />
                    Edit Before Adding
                  </button>
                )}
                {isEditing && (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn-secondary flex items-center justify-center gap-2 flex-1 sm:flex-none"
                  >
                    <Save size={16} />
                    Save Changes
                  </button>
                )}
                <button
                  onClick={handleExtractAnother}
                  className="btn-ghost flex items-center justify-center gap-2 flex-1 sm:flex-none"
                >
                  <RefreshCw size={16} />
                  Extract Another
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ ERROR CARD ============ */}
      <AnimatePresence>
        {result && !isExtracting && result.confidence < 0.2 && result.title === null && (
          <motion.div
            key="error-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6"
          >
            <div className="rounded-xl p-5 border flex items-start gap-4" style={{ backgroundColor: '#fff1f2', borderColor: 'var(--accent-danger)' }}>
              <AlertTriangle size={24} className="text-[var(--accent-danger)] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Couldn&apos;t extract from this URL</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  The generic parser could not find structured data. Try a different URL or add details manually.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ RECENT EXTRACTS ============ */}
      {extractHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.25 }}
          className="mt-10 pt-6 border-t border-[var(--border-default)]"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Recent Extractions</h3>
          </div>
          <div className="space-y-1">
            {extractHistory.slice(0, 10).map((item, index) => (
              <motion.div
                key={`${item.url}-${index}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.2 }}
                className="flex items-center gap-3 py-3 border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-hover)] hover:rounded-lg hover:px-3 transition-all cursor-pointer group"
                onClick={() => { setUrl(item.url); runExtraction(item.url); }}
              >
                <Paperclip size={18} className="text-[var(--text-tertiary)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title || item.url}</div>
                  <div className="text-xs font-mono text-[var(--text-tertiary)] truncate">{item.url}</div>
                </div>
                <span className="text-xs text-[var(--text-tertiary)] shrink-0">
                  {(() => {
                    const diff = Date.now() - new Date(item.date).getTime();
                    const mins = Math.floor(diff / 60000);
                    if (mins < 1) return 'Just now';
                    if (mins < 60) return `${mins}m ago`;
                    const hrs = Math.floor(mins / 60);
                    if (hrs < 24) return `${hrs}h ago`;
                    return `${Math.floor(hrs / 24)}d ago`;
                  })()}
                </span>
                <ChevronRight size={16} className="text-[var(--text-tertiary)] shrink-0" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
