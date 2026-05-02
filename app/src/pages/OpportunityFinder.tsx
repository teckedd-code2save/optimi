import { useState, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import type { OpportunityType, ParsedOpportunity } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { parseUrl } from '@/lib/parsers/index';
import { scrapeUrl } from '@/lib/api';
import { TypeBadge } from '@/components/TypeBadge';
import { DeadlineBadge } from '@/components/DeadlineBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Compass,
  Search,
  LayoutGrid,
  Trophy,
  DollarSign,
  Rocket,
  Briefcase,
  Landmark,
  Layers,
  BookmarkPlus,
  BookmarkCheck,
  ExternalLink,
  Zap,
  SearchX,
  Inbox,
  Send,
  X,
  MapPin,
  Calendar,
  SlidersHorizontal,
  Info,
  Loader2,
  Link2,
  AlertTriangle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Verified curated data — only real, working URLs                   */
/* ------------------------------------------------------------------ */
interface CuratedOpportunity {
  id: string;
  title: string;
  organization: string;
  type: OpportunityType;
  deadline: string;
  description: string;
  prizes: string;
  location: string;
  sourceUrl: string;
}

const CURATED_OPPORTUNITIES: CuratedOpportunity[] = [
  {
    id: 'curated-1',
    title: 'Stripe Atlas',
    organization: 'Stripe',
    type: 'platform',
    deadline: '2026-12-31',
    description: 'Start a US company from anywhere. Incorporation, banking, and payments setup.',
    prizes: 'Company formation + tools',
    location: 'Global',
    sourceUrl: 'https://stripe.com/atlas',
  },
  {
    id: 'curated-2',
    title: 'Google Summer of Code 2026',
    organization: 'Google',
    type: 'grant',
    deadline: '2026-05-12',
    description: 'Mentorship program introducing contributors to open source software development.',
    prizes: 'Stipend + mentorship',
    location: 'Remote',
    sourceUrl: 'https://summerofcode.withgoogle.com',
  },
  {
    id: 'curated-3',
    title: 'USAII Global Hackathon 2026',
    organization: 'USAII',
    type: 'hackathon',
    deadline: '2026-06-06',
    description: 'Global virtual AI hackathon for students. Build solutions for real-world impact — from everyday problems to career readiness tools.',
    prizes: '$15,000 + Certification Scholarships',
    location: 'Online',
    sourceUrl: 'https://usaii-global-ai-hackathon-2026.devpost.com/',
  },
  {
    id: 'curated-4',
    title: 'a16z Speedrun SR007',
    organization: 'Andreessen Horowitz',
    type: 'accelerator',
    deadline: '2026-05-17',
    description: '10-week accelerator for AI and gaming startups. $750K investment on a $10M cap.',
    prizes: '$750K at $10M cap',
    location: 'San Francisco, CA',
    sourceUrl: 'https://speedrun.a16z.com/apply',
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const easeSpring = [0.16, 1, 0.3, 1] as [number, number, number, number];

type SortOption = 'deadline' | 'newest' | 'prize';

const FILTER_PILLS: { key: string; label: string; icon: React.ReactNode; filter: OpportunityType | null }[] = [
  { key: 'all', label: 'All', icon: <LayoutGrid size={14} />, filter: null },
  { key: 'hackathon', label: 'Hackathons', icon: <Trophy size={14} />, filter: 'hackathon' },
  { key: 'grant', label: 'Grants', icon: <DollarSign size={14} />, filter: 'grant' },
  { key: 'accelerator', label: 'Accelerators', icon: <Rocket size={14} />, filter: 'accelerator' },
  { key: 'job', label: 'Jobs', icon: <Briefcase size={14} />, filter: 'job' },
  { key: 'government', label: 'Government', icon: <Landmark size={14} />, filter: 'government' },
  { key: 'platform', label: 'Platforms', icon: <Layers size={14} />, filter: 'platform' },
];

function daysUntil(deadline: string): number {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function timeLeftColor(days: number): string {
  if (days < 3) return 'var(--accent-danger)';
  if (days < 7) return 'var(--accent-warning)';
  if (days < 30) return 'var(--accent-success)';
  return 'var(--text-tertiary)';
}

function timeLeftLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day left';
  return `${days}d left`;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function OpportunityFinder() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('deadline');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipUrl, setTipUrl] = useState('');
  const [isSubmittingTip, setIsSubmittingTip] = useState(false);
  const addOpportunity = useAppStore((s) => s.addOpportunity);
  const settings = useAppStore((s) => s.settings);
  const addExtractHistory = useAppStore((s) => s.addExtractHistory);

  const filtered = useMemo(() => {
    let data = [...CURATED_OPPORTUNITIES];

    if (activeFilter !== 'all') {
      const typeFilter = FILTER_PILLS.find((p) => p.key === activeFilter)?.filter;
      if (typeFilter) {
        data = data.filter((o) => o.type === typeFilter);
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          o.organization.toLowerCase().includes(q) ||
          o.description.toLowerCase().includes(q)
      );
    }

    data.sort((a, b) => {
      if (sortBy === 'deadline') return daysUntil(a.deadline) - daysUntil(b.deadline);
      if (sortBy === 'newest') return b.deadline.localeCompare(a.deadline);
      if (sortBy === 'prize') {
        const extractNum = (s: string) => {
          const m = s.replace(/,/g, '').match(/\d+/);
          return m ? parseInt(m[0]) : 0;
        };
        return extractNum(b.prizes) - extractNum(a.prizes);
      }
      return 0;
    });

    return data;
  }, [search, activeFilter, sortBy]);

  const handleSave = (opp: CuratedOpportunity) => {
    if (savedIds.has(opp.id)) {
      toast.info('Already saved to tracker');
      return;
    }

    addOpportunity({
      id: generateId(),
      title: opp.title,
      organization: opp.organization,
      type: opp.type,
      status: 'saved',
      url: opp.sourceUrl,
      deadline: opp.deadline,
      description: opp.description,
      requirements: [],
      prizes: opp.prizes,
      location: opp.location,
      checklist: [],
      notes: '',
      dateAdded: new Date().toISOString(),
    });

    setSavedIds((prev) => new Set(prev).add(opp.id));
    toast.success(`${opp.title} saved to tracker!`);
  };

  const handleSearchClear = () => setSearch('');

  const handleSubmitTip = async () => {
    const raw = tipUrl.trim();
    if (!raw) return;

    let url = raw;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    try {
      new URL(url);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setIsSubmittingTip(true);
    const toastId = toast.loading('Extracting opportunity details...');

    let parsed: ParsedOpportunity | null = null;
    let extractionFailed = false;

    try {
      // Try backend first if configured
      if (settings.backendUrl) {
        try {
          parsed = await scrapeUrl(settings.backendUrl, url);
        } catch {
          parsed = await parseUrl(url);
        }
      } else {
        parsed = await parseUrl(url);
      }
    } catch {
      extractionFailed = true;
    }

    // Always save — even if extraction completely failed
    const title = parsed?.title || 'Untitled Opportunity';
    const org = parsed?.organization || new URL(url).hostname.replace(/^www\./, '').split('.')[0];
    const confidence = parsed?.confidence ?? 0;

    addOpportunity({
      id: generateId(),
      title,
      organization: org,
      type: parsed?.type || 'other',
      status: 'saved',
      url,
      deadline: parsed?.deadline ?? null,
      description: parsed?.description || `Opportunity found at ${url}`,
      requirements: parsed?.requirements || [],
      prizes: parsed?.prizes || undefined,
      location: parsed?.location || undefined,
      checklist: [],
      notes: '',
      dateAdded: new Date().toISOString(),
      parsedFrom: url,
      extractionConfidence: confidence,
    });

    addExtractHistory({
      url,
      title,
      date: new Date().toISOString(),
      added: true,
    });

    if (extractionFailed || confidence < 0.2) {
      toast.success(
        `Saved URL to tracker. We couldn't auto-read this page — tap the card in your dashboard to add details.`,
        { id: toastId, duration: 5000 }
      );
    } else {
      toast.success(`"${title}" added to your tracker!`, { id: toastId });
    }

    setTipUrl('');
    setShowTipModal(false);
    setIsSubmittingTip(false);
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-[1200px] mx-auto">
        {/* ============ HEADER ============ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: easeSpring }}
        >
          <div className="flex items-center gap-3 mb-1">
            <Compass size={28} className="text-[var(--accent-primary)]" />
            <h1 className="text-2xl lg:text-3xl font-semibold text-[var(--text-primary)]">Opportunity Finder</h1>
          </div>
          <p className="text-[var(--text-secondary)] text-sm lg:text-base mb-3">
            Discover curated hackathons, grants, and accelerators with verified links
          </p>
          <div className="mb-5 flex items-start gap-2.5 bg-[#eef2ff] border border-[#c7d2fe] rounded-lg px-3.5 py-2.5 text-xs text-[#4338ca]">
            <Info size={16} className="shrink-0 mt-0.5" />
            <span>
              <strong>How it works:</strong> The Finder is a read-only feed of verified opportunities.
              Click <strong>Save to Tracker</strong> to copy any opportunity to your personal Dashboard,
              where you can move it through your pipeline, add notes, and track deadlines.
              You can also add custom opportunities directly from your Dashboard.
            </span>
          </div>
        </motion.div>

        {/* ============ SEARCH BAR ============ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.08, ease: easeSpring }}
          className="relative mb-4"
        >
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder="Search by name, organization, or keyword..."
                className="w-full h-[52px] pl-12 pr-10 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-all"
              />
              {search && (
                <button
                  onClick={handleSearchClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <button
              onClick={() => toast.info('Use the filter pills below to refine results')}
              className="lg:hidden btn-secondary flex items-center justify-center"
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </motion.div>

        {/* ============ FILTER PILLS ============ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {FILTER_PILLS.map((pill, i) => {
            const isActive = activeFilter === pill.key;
            return (
              <motion.button
                key={pill.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.03, duration: 0.2 }}
                onClick={() => setActiveFilter(pill.key)}
                className={
                  isActive
                    ? 'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-[var(--accent-primary)] text-white border border-[var(--accent-primary)] whitespace-nowrap shrink-0 scroll-snap-align-start transition-colors'
                    : 'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-default)] whitespace-nowrap shrink-0 scroll-snap-align-start hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)] transition-colors'
                }
              >
                {pill.icon}
                {pill.label}
              </motion.button>
            );
          })}
        </motion.div>

        {/* ============ SORT & RESULTS COUNT ============ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-b border-[var(--border-default)] mb-4">
          <span className="text-sm text-[var(--text-secondary)]">
            <span className="font-mono font-semibold text-[var(--text-primary)]">{filtered.length}</span>{' '}
            {filtered.length === 1 ? 'opportunity' : 'opportunities'} found
          </span>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-tertiary)]">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            >
              <option value="deadline">Deadline (soonest)</option>
              <option value="newest">Recently Added</option>
              <option value="prize">Prize Amount</option>
            </select>
          </div>
        </div>

        {/* ============ EMPTY STATE ============ */}
        <AnimatePresence>
          {filtered.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center justify-center py-12 px-6"
            >
              <div className="w-20 h-20 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
                <SearchX size={48} className="text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">No opportunities found</h3>
              <p className="text-sm text-[var(--text-secondary)] text-center max-w-[360px] mb-4">
                Try adjusting your filters or search terms to discover more opportunities.
              </p>
              <button
                onClick={() => { setSearch(''); setActiveFilter('all'); }}
                className="btn-secondary"
              >
                Clear all filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============ CARDS GRID ============ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((opp, index) => {
              const days = daysUntil(opp.deadline);
              const isSaved = savedIds.has(opp.id);

              return (
                <motion.div
                  key={opp.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05, duration: 0.25, ease: easeSpring }}
                  className="card-optimi p-5 flex flex-col group hover:shadow-md hover:-translate-y-0.5 hover:border-[#d6d3d1] transition-all duration-200"
                >
                  {/* Card header: badge + save */}
                  <div className="flex items-start justify-between mb-3">
                    <TypeBadge type={opp.type} />
                    <button
                      onClick={() => handleSave(opp)}
                      className={
                        isSaved
                          ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0]'
                          : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all'
                      }
                    >
                      {isSaved ? <BookmarkCheck size={14} /> : <BookmarkPlus size={14} />}
                      {isSaved ? 'Saved' : 'Save'}
                    </button>
                  </div>

                  {/* Title & org */}
                  <h3 className="text-base font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 mb-0.5">
                    {opp.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    Organized by {opp.organization}
                  </p>

                  {/* Description */}
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-3 flex-1">
                    {opp.description}
                  </p>

                  {/* Info rows */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-[var(--text-tertiary)] shrink-0" />
                      <span className="text-xs text-[var(--text-tertiary)]">Deadline</span>
                      <span className="text-xs font-mono font-medium ml-auto">
                        <DeadlineBadge deadline={opp.deadline} />
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy size={14} className="text-[var(--text-tertiary)] shrink-0" />
                      <span className="text-xs text-[var(--text-tertiary)]">Prize</span>
                      <span className="text-xs font-mono text-[var(--text-primary)] ml-auto truncate max-w-[60%] text-right">
                        {opp.prizes}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-[var(--text-tertiary)] shrink-0" />
                      <span className="text-xs text-[var(--text-tertiary)]">Location</span>
                      <span className="text-xs text-[var(--text-primary)] ml-auto truncate max-w-[60%] text-right">
                        {opp.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-tertiary)] ml-auto font-mono font-semibold" style={{ color: timeLeftColor(days) }}>
                        {timeLeftLabel(days)}
                      </span>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="pt-3 border-t border-[var(--border-default)] flex gap-2">
                    <a
                      href={opp.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-xs py-2"
                    >
                      <ExternalLink size={13} />
                      Open
                    </a>
                    <button
                      onClick={() => handleSave(opp)}
                      className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs py-2"
                    >
                      <Zap size={13} />
                      Save to Tracker
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ============ SUBMIT A TIP CARD ============ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.25 }}
          className="mt-6 mb-8 rounded-xl p-6 border text-center sm:text-left sm:flex sm:items-center sm:gap-5"
          style={{
            backgroundColor: 'rgba(79, 70, 229, 0.06)',
            borderColor: 'rgba(79, 70, 229, 0.15)',
          }}
        >
          <div className="flex justify-center sm:justify-start">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
            >
              <Inbox size={32} className="text-[var(--accent-primary)]" />
            </motion.div>
          </div>
          <div className="mt-3 sm:mt-0 flex-1">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Know an opportunity we missed?
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Submit a URL and our parsers will add it to the feed for everyone.
            </p>
          </div>
          <button
            onClick={() => setShowTipModal(true)}
            className="btn-primary mt-4 sm:mt-0 inline-flex items-center justify-center gap-2"
          >
            <Send size={14} />
            Submit a Tip
          </button>
        </motion.div>

        {/* ============ SUBMIT TIP MODAL ============ */}
        <AnimatePresence>
          {showTipModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
              onClick={(e) => { if (e.target === e.currentTarget) setShowTipModal(false); }}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 12 }}
                transition={{ duration: 0.2, ease: easeSpring }}
                className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] shadow-2xl w-full max-w-md overflow-hidden"
              >
                <div className="px-6 pt-6 pb-4 border-b border-[var(--border-default)] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center">
                      <Send size={16} className="text-[var(--accent-primary)]" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[var(--text-primary)]">Submit a Tip</h3>
                      <p className="text-xs text-[var(--text-secondary)]">Paste a URL and we&apos;ll extract the details</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTipModal(false)}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Opportunity URL</label>
                    <div className="relative">
                      <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                      <input
                        type="url"
                        value={tipUrl}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setTipUrl(e.target.value)}
                        placeholder="https://example.com/hackathon"
                        className="w-full h-11 pl-10 pr-4 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] transition-all"
                        onKeyDown={(e) => { if (e.key === 'Enter' && tipUrl.trim() && !isSubmittingTip) handleSubmitTip(); }}
                      />
                    </div>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5 flex items-center gap-1">
                      <AlertTriangle size={11} />
                      The opportunity will be added to your personal tracker.
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2 flex gap-3">
                  <button
                    onClick={() => setShowTipModal(false)}
                    className="btn-secondary flex-1 py-2.5 text-sm"
                    disabled={isSubmittingTip}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitTip}
                    disabled={!tipUrl.trim() || isSubmittingTip}
                    className="btn-primary flex-1 py-2.5 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingTip ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Zap size={14} />
                        Extract & Save
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
