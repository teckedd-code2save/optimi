import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Send,
  Calendar as CalendarIcon,
  AlertTriangle,
  Clock,
  ExternalLink,
  Plus,
  ArrowDownCircle,
  X,
  ChevronDown,
  Search,
  MoreVertical,
  Trash2,
  ArrowRightLeft,
  ArrowUpDown,
} from 'lucide-react';
import { differenceInDays, isPast, parseISO, format } from 'date-fns';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import type { OpportunityStatus, Opportunity, OpportunityType } from '@/types';
import { TypeBadge } from '@/components/TypeBadge';
// StatusBadge imported for future use
// import { StatusBadge } from '@/components/StatusBadge';
import { DeadlineBadge } from '@/components/DeadlineBadge';
import { EmptyState } from '@/components/EmptyState';

const COLUMNS: { status: OpportunityStatus; label: string; color: string }[] = [
  { status: 'saved', label: 'Saved', color: '#d6d3d1' },
  { status: 'researching', label: 'Researching', color: '#3b82f6' },
  { status: 'preparing', label: 'Preparing', color: '#f59e0b' },
  { status: 'applied', label: 'Applied', color: '#10b981' },
  { status: 'interview', label: 'Interview', color: '#8b5cf6' },
  { status: 'accepted', label: 'Result', color: '#d6d3d1' },
];

const TYPE_FILTERS: { type: OpportunityType | 'all'; label: string }[] = [
  { type: 'all', label: 'All Opportunities' },
  { type: 'hackathon', label: 'Hackathons' },
  { type: 'grant', label: 'Grants' },
  { type: 'accelerator', label: 'Accelerators' },
  { type: 'government', label: 'Government' },
  { type: 'platform', label: 'Platform' },
  { type: 'job', label: 'Jobs' },
  { type: 'other', label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'deadline', label: 'Sort by Deadline' },
  { value: 'name', label: 'Sort by Name' },
  { value: 'added', label: 'Sort by Date Added' },
];

function getDeadlineUrgency(deadline: string | null): 'overdue' | 'urgent' | 'soon' | 'normal' {
  if (!deadline) return 'normal';
  const date = parseISO(deadline);
  const now = new Date();
  const daysLeft = differenceInDays(date, now);
  if (isPast(date) && daysLeft < 0) return 'overdue';
  if (daysLeft < 3) return 'urgent';
  if (daysLeft < 7) return 'soon';
  return 'normal';
}

/* ─── Due This Week Banner ─── */
function DueThisWeekBanner({
  opportunities,
  onDismiss,
}: {
  opportunities: Opportunity[];
  onDismiss: () => void;
}) {
  const deadlines = useMemo(() => {
    const now = new Date();
    return opportunities
      .filter((o) => o.deadline)
      .filter((o) => {
        const daysLeft = differenceInDays(parseISO(o.deadline!), now);
        return daysLeft >= 0 && daysLeft < 7;
      })
      .sort((a, b) => {
        if (!a.deadline || !b.deadline) return 0;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
  }, [opportunities]);

  if (deadlines.length === 0) return null;

  const names = deadlines.map((o) => {
    const daysLeft = differenceInDays(parseISO(o.deadline!), new Date());
    return `${o.title} (${daysLeft}d)`;
  }).join(', ');

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -12, height: 0 }}
      className="mb-4 bg-[#fffbeb] border border-[#fde68a] rounded-xl px-4 py-3 flex items-start gap-3"
    >
      <AlertTriangle className="w-4 h-4 text-[var(--accent-warning)] shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#92400e]">
          {deadlines.length} deadline{deadlines.length > 1 ? 's' : ''} this week
        </p>
        <p className="text-xs text-[#b45309] mt-0.5 truncate">{names}</p>
      </div>
      <button
        onClick={onDismiss}
        className="w-7 h-7 flex items-center justify-center rounded-md text-[#b45309] hover:bg-[#fde68a] transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

/* ─── Card Dropdown Menu ─── */
function CardMenu({
  opp,
  onDelete,
}: {
  opp: Opportunity;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const store = useAppStore();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
        aria-label="More actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-44 bg-white border border-[var(--border-default)] rounded-xl shadow-lg z-20 py-1"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/opportunity/${opp.id}`);
              }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Details
            </button>
            <div className="border-t border-[var(--border-subtle)] my-1" />
            {COLUMNS.filter((c) => c.status !== opp.status).map((col) => (
              <button
                key={col.status}
                onClick={(e) => {
                  e.stopPropagation();
                  store.moveStatus(opp.id, col.status);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] flex items-center gap-2"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Move to {col.label}
              </button>
            ))}
            <div className="border-t border-[var(--border-subtle)] my-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--accent-danger)] hover:bg-[#fff1f2] flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Kanban Card ─── */
function KanbanCard({
  opp,
  index,
  onDelete,
}: {
  opp: Opportunity;
  index: number;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const completedCount = opp.checklist.filter((i) => i.completed).length;
  const totalCount = opp.checklist.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleClick = () => {
    navigate(`/opportunity/${opp.id}`);
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(opp.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, x: 20 }}
      transition={{
        duration: 0.25,
        delay: index * 0.04,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        layout: { duration: 0.2 },
      }}
      onClick={handleClick}
      className="bg-white border border-[var(--border-default)] rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-[#d6d3d1] transition-all duration-200 active:scale-[0.98] min-h-[120px]"
    >
      {/* Header: Type badge + Menu */}
      <div className="flex items-start justify-between mb-2">
        <TypeBadge type={opp.type} />
        <div onClick={(e) => e.stopPropagation()}>
          <CardMenu opp={opp} onDelete={onDelete} />
        </div>
      </div>

      {/* Title */}
      <h4 className="font-semibold text-[var(--text-primary)] text-sm leading-snug line-clamp-2 mb-1">
        {opp.title}
      </h4>

      {/* Organization */}
      <p className="text-xs text-[var(--text-secondary)] truncate mb-2">
        {opp.organization}
      </p>

      {/* Prize */}
      {opp.prizes && (
        <p className="text-xs text-[var(--text-secondary)] font-mono mb-2 truncate">
          {opp.prizes}
        </p>
      )}

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mt-2 mb-1">
          <div className="h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="h-full rounded-full bg-[var(--accent-primary)]"
            />
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 font-medium">
            {completedCount}/{totalCount} tasks
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <DeadlineBadge deadline={opp.deadline} />
        </div>
        <button
          onClick={handleLinkClick}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] transition-colors min-w-[32px] min-h-[32px]"
          aria-label="Open external link"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Kanban Column ─── */
function KanbanColumn({
  status: _status,
  label,
  color,
  opportunities,
  onDeleteOpportunity,
}: {
  status: OpportunityStatus;
  label: string;
  color: string;
  opportunities: Opportunity[];
  onDeleteOpportunity: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="flex flex-col min-w-[280px] sm:min-w-[300px] lg:min-w-0"
    >
      {/* Column Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 py-3 px-1 w-full text-left lg:cursor-default lg:pointer-events-none min-h-[44px]"
      >
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="font-semibold text-sm text-[var(--text-primary)]">{label}</span>
        <span className="ml-auto text-xs font-mono text-[var(--text-tertiary)] bg-[var(--bg-elevated)] w-6 h-6 rounded-full flex items-center justify-center shrink-0">
          {opportunities.length}
        </span>
      </button>

      {/* Cards */}
      <AnimatePresence mode="popLayout">
        {!collapsed && (
          <motion.div
            layout
            className="flex flex-col gap-2.5 min-h-[120px]"
          >
            {opportunities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-[var(--border-default)] rounded-xl">
                <ArrowDownCircle className="w-6 h-6 text-[var(--text-muted)] mb-1" />
                <span className="text-xs text-[var(--text-muted)]">Drop here</span>
              </div>
            ) : (
              opportunities.map((opp, idx) => (
                <KanbanCard
                  key={opp.id}
                  opp={opp}
                  index={idx}
                  onDelete={() => onDeleteOpportunity(opp.id)}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Mobile Pipeline View ─── */
function MobilePipelineView({
  grouped,
  onDeleteOpportunity,
}: {
  grouped: Record<string, Opportunity[]>;
  onDeleteOpportunity: (id: string) => void;
}) {
  const [activeStatus, setActiveStatus] = useState<OpportunityStatus>('saved');
  const activeCol = COLUMNS.find((c) => c.status === activeStatus)!;
  const opps = grouped[activeStatus] || [];

  return (
    <div>
      {/* Scrollable status pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
        {COLUMNS.map((col) => (
          <button
            key={col.status}
            onClick={() => setActiveStatus(col.status)}
            className={`snap-start flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-all min-h-[44px] ${
              activeStatus === col.status
                ? 'bg-[var(--accent-primary)] text-white shadow-md'
                : 'bg-white border border-[var(--border-default)] text-[var(--text-secondary)]'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${activeStatus === col.status ? 'bg-white' : ''}`}
              style={{ backgroundColor: activeStatus === col.status ? '#fff' : col.color }}
            />
            {col.label}
            <span
              className={`text-xs font-mono ml-1 ${
                activeStatus === col.status ? 'text-white/80' : 'text-[var(--text-tertiary)]'
              }`}
            >
              {grouped[col.status]?.length || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Cards for active status */}
      <div className="mt-1 min-h-[300px]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeCol.color }} />
          <span className="font-semibold text-sm text-[var(--text-primary)]">{activeCol.label}</span>
          <span className="text-xs font-mono text-[var(--text-tertiary)] bg-[var(--bg-elevated)] w-6 h-6 rounded-full flex items-center justify-center ml-auto">
            {opps.length}
          </span>
        </div>

        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeStatus}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2.5"
          >
            {opps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-[var(--border-default)] rounded-xl">
                <ArrowDownCircle className="w-8 h-8 text-[var(--text-muted)] mb-2" />
                <span className="text-sm text-[var(--text-muted)]">No opportunities in {activeCol.label}</span>
              </div>
            ) : (
              opps.map((opp, idx) => (
                <KanbanCard
                  key={opp.id}
                  opp={opp}
                  index={idx}
                  onDelete={() => onDeleteOpportunity(opp.id)}
                />
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Add Opportunity Modal ─── */
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

function AddOpportunityModal({ onClose }: { onClose: () => void }) {
  const addOpportunity = useAppStore((s) => s.addOpportunity);
  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [type, setType] = useState<OpportunityType>('hackathon');
  const [deadline, setDeadline] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !organization.trim()) return;

    const now = new Date().toISOString();
    addOpportunity({
      id: generateId(),
      title: title.trim(),
      organization: organization.trim(),
      type,
      status: 'saved',
      url: url.trim() || '#',
      deadline: deadline || null,
      description: '',
      requirements: [],
      checklist: [],
      notes: '',
      dateAdded: now,
      dateModified: now,
    });
    toast.success(`Added "${title.trim()}" to your tracker`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      {/* Modal */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-xl"
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--border-default)]" />
        </div>

        <div className="px-5 pb-6 pt-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Add Opportunity</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., USAII Global Hackathon"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Organization *</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g., USAII"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as OpportunityType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
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
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Deadline (optional)</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
              />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              This adds to your personal tracker. Browse the{' '}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.location.hash = '#/finder';
                }}
                className="text-[var(--accent-primary)] hover:underline font-medium"
              >
                Opportunity Finder
              </button>{' '}
              for curated opportunities.
            </p>
            <div className="pt-2 flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm py-2.5">
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1 text-sm py-2.5">
                Add Opportunity
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Main Home Page ─── */
export function Home() {
  const navigate = useNavigate();
  const opportunities = useAppStore((s) => s.opportunities);
  const deleteOpportunity = useAppStore((s) => s.deleteOpportunity);

  // Local UI state
  const [typeFilter, setTypeFilter] = useState<OpportunityType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'name' | 'added'>('deadline');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close sort dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    }
    if (showSortDropdown) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSortDropdown]);

  // Filtered opportunities
  const filteredOpportunities = useMemo(() => {
    let filtered = opportunities;

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((o) => o.type === typeFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          o.organization.toLowerCase().includes(q)
      );
    }

    // Sort
    const sorted = [...filtered];
    if (sortBy === 'deadline') {
      sorted.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
    } else if (sortBy === 'name') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'added') {
      sorted.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
    }
    return sorted;
  }, [opportunities, typeFilter, sortBy, searchQuery]);

  // Stats calculations (on unfiltered data)
  const stats = useMemo(() => {
    const now = new Date();
    const total = opportunities.length;
    const applied = opportunities.filter((o) =>
      ['applied', 'interview', 'accepted'].includes(o.status)
    ).length;
    const thisWeek = opportunities.filter((o) => {
      if (!o.deadline) return false;
      const daysLeft = differenceInDays(parseISO(o.deadline), now);
      return daysLeft >= 0 && daysLeft < 7;
    }).length;
    const urgent = opportunities.filter((o) => {
      if (!o.deadline) return false;
      const daysLeft = differenceInDays(parseISO(o.deadline), now);
      return daysLeft >= 0 && daysLeft < 3;
    }).length;
    return { total, applied, thisWeek, urgent };
  }, [opportunities]);

  // Group filtered opportunities by status
  const grouped = useMemo(() => {
    const map: Record<string, Opportunity[]> = {};
    for (const col of COLUMNS) {
      if (col.label === 'Result') {
        map[col.status] = filteredOpportunities.filter((o) =>
          ['accepted', 'rejected', 'declined'].includes(o.status)
        );
      } else {
        map[col.status] = filteredOpportunities.filter((o) => o.status === col.status);
      }
    }
    return map;
  }, [filteredOpportunities]);

  // Upcoming deadlines for mobile
  const upcomingDeadlines = useMemo(() => {
    return opportunities
      .filter((o) => o.deadline)
      .sort((a, b) => {
        if (!a.deadline || !b.deadline) return 0;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      })
      .slice(0, 3);
  }, [opportunities]);

  const statCards = [
    {
      label: 'Total Tracking',
      value: stats.total,
      icon: Layers,
      color: 'text-[var(--text-primary)]',
    },
    {
      label: 'Applied',
      value: stats.applied,
      icon: Send,
      color: 'text-[var(--accent-primary)]',
    },
    {
      label: 'This Week',
      value: stats.thisWeek,
      icon: CalendarIcon,
      color: 'text-[var(--accent-success)]',
    },
    {
      label: 'Urgent',
      value: stats.urgent,
      icon: AlertTriangle,
      color: 'text-[var(--accent-danger)]',
    },
  ];

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label;

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto relative pb-24 lg:pb-6">
      {/* Due This Week Banner */}
      <AnimatePresence>
        {!bannerDismissed && (
          <DueThisWeekBanner
            opportunities={opportunities}
            onDismiss={() => setBannerDismissed(true)}
          />
        )}
      </AnimatePresence>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 mb-5">
        {statCards.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.25,
              delay: idx * 0.06,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
            className="bg-white border border-[var(--border-default)] rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-[var(--text-tertiary)] font-medium">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)] font-mono tracking-tight">
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Quick Filter Bar + Search + Sort */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.2 }}
        className="mb-4"
      >
        {/* Search + Sort row */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search opportunities..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-white text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
            />
          </div>
          <div ref={sortRef} className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-[var(--border-default)] bg-white text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors whitespace-nowrap"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{currentSortLabel}</span>
            </button>
            <AnimatePresence>
              {showSortDropdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 w-48 bg-white border border-[var(--border-default)] rounded-xl shadow-lg z-20 py-1"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSortBy(opt.value as 'deadline' | 'name' | 'added');
                        setShowSortDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                        sortBy === opt.value
                          ? 'text-[var(--accent-primary)] bg-[#eef2ff] font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      {sortBy === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />}
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Desktop Add button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="hidden sm:flex btn-primary items-center gap-2 text-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add New
          </button>
        </div>

        {/* Type filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide snap-x snap-mandatory">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.type}
              onClick={() => setTypeFilter(filter.type)}
              className={`snap-start flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all min-h-[36px] ${
                typeFilter === filter.type
                  ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                  : 'bg-white border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Pipeline Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.25 }}
        className="flex items-center justify-between py-3 border-b border-[var(--border-subtle)] mb-4"
      >
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">My Pipeline</h2>
          <p className="hidden lg:block text-xs text-[var(--text-tertiary)] mt-0.5">
            {typeFilter !== 'all'
              ? `Showing ${TYPE_FILTERS.find((f) => f.type === typeFilter)?.label}`
              : 'Track your opportunities through each stage'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(typeFilter !== 'all' || searchQuery) && (
            <span className="text-xs text-[var(--text-tertiary)]">
              {filteredOpportunities.length} result{filteredOpportunities.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </motion.div>

      {/* Mobile Pipeline View */}
      <div className="lg:hidden">
        <MobilePipelineView grouped={grouped} onDeleteOpportunity={deleteOpportunity} />
      </div>

      {/* Desktop/Tablet Kanban */}
      <div className="hidden lg:grid lg:grid-cols-6 gap-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            color={col.color}
            opportunities={grouped[col.status] || []}
            onDeleteOpportunity={deleteOpportunity}
          />
        ))}
      </div>

      {/* Mobile: Horizontal snap columns for tablet */}
      <div className="hidden sm:flex lg:hidden gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
        {COLUMNS.map((col) => (
          <div key={col.status} className="snap-start min-w-[45vw]">
            <KanbanColumn
              status={col.status}
              label={col.label}
              color={col.color}
              opportunities={grouped[col.status] || []}
              onDeleteOpportunity={deleteOpportunity}
            />
          </div>
        ))}
      </div>

      {/* Mobile Upcoming Deadlines */}
      <div className="lg:hidden mt-8">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--text-tertiary)]" />
          Upcoming Deadlines
        </h3>
        {upcomingDeadlines.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title="No upcoming deadlines"
            description="Add opportunities with deadlines to see them here."
          />
        ) : (
          <div className="space-y-2">
            {upcomingDeadlines.map((opp, idx) => {
              const urgency = getDeadlineUrgency(opp.deadline);
              const dotColor =
                urgency === 'overdue' || urgency === 'urgent'
                  ? '#f43f5e'
                  : urgency === 'soon'
                    ? '#f59e0b'
                    : '#10b981';
              return (
                <motion.div
                  key={opp.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: idx * 0.05,
                    ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                  }}
                  onClick={() => navigate(`/opportunity/${opp.id}`)}
                  className="bg-white border border-[var(--border-default)] rounded-lg p-3.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: dotColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {opp.title}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] font-mono">
                      {opp.deadline ? format(parseISO(opp.deadline), 'MMM d, yyyy') : 'No date'}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[var(--text-muted)] rotate-[-90deg] shrink-0" />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button (mobile only) */}
      <button
        onClick={() => setShowAddModal(true)}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-[var(--accent-primary)] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[var(--accent-primary-hover)] active:scale-95 transition-all z-40"
        aria-label="Add opportunity"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add Opportunity Modal */}
      <AnimatePresence>
        {showAddModal && <AddOpportunityModal onClose={() => setShowAddModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
