import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ExternalLink,
  Calendar,
  Trophy,
  MapPin,
  Users,
  Tag,
  Building2,
  Link2,
  Clock,
  RefreshCw,
  CheckSquare,
  Plus,
  FileText,
  Sparkles,
  Mail,
  Send,
  PenTool,
  MessageSquare,
  User,
  Trash2,
  Copy,
  ChevronDown,
  Globe,
  Edit3,
  X,
  Check,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAppStore } from '@/store/useAppStore';
import type { OpportunityStatus, OpportunityType } from '@/types';
import { TypeBadge } from '@/components/TypeBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { DeadlineBadge } from '@/components/DeadlineBadge';

const PIPELINE_STEPS: { status: OpportunityStatus; label: string }[] = [
  { status: 'saved', label: 'Saved' },
  { status: 'researching', label: 'Researching' },
  { status: 'preparing', label: 'Preparing' },
  { status: 'applied', label: 'Applied' },
  { status: 'interview', label: 'Interview' },
  { status: 'accepted', label: 'Accepted' },
];

const STATUS_COLORS: Record<OpportunityStatus, string> = {
  saved: '#6b7280',
  researching: '#3b82f6',
  preparing: '#f59e0b',
  applied: '#4f46e5',
  interview: '#8b5cf6',
  accepted: '#10b981',
  rejected: '#f43f5e',
  declined: '#6b7280',
};

const AI_TEMPLATES: {
  types: OpportunityType[];
  label: string;
  icon: typeof Mail;
}[] = [
  { types: ['hackathon', 'accelerator', 'grant', 'government', 'platform', 'job', 'other'], label: 'Cover Letter', icon: Mail },
  { types: ['hackathon'], label: 'Project Proposal', icon: FileText },
  { types: ['hackathon'], label: 'Team Bio', icon: User },
  { types: ['accelerator'], label: 'Pitch', icon: Send },
  { types: ['grant', 'government'], label: 'Grant Essay', icon: PenTool },
  { types: ['grant', 'government'], label: 'Impact Statement', icon: FileText },
  { types: ['job', 'platform'], label: 'Cold Email', icon: Send },
  { types: ['job', 'platform'], label: 'CV Summary', icon: User },
  { types: ['hackathon', 'accelerator', 'grant', 'government', 'platform', 'job', 'other'], label: 'Follow-up', icon: MessageSquare },
];

/* ─── Collapsible Card Wrapper ─── */
function CollapsibleCard({
  title,
  icon: Icon,
  headerRight,
  defaultExpanded = true,
  children,
  className = '',
}: {
  title: string;
  icon: typeof CheckSquare;
  headerRight?: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className={`bg-white border border-[var(--border-default)] rounded-2xl shadow-sm overflow-hidden ${className}`}
    >
      {/* Collapsible Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left sm:cursor-default sm:pointer-events-none"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[var(--text-tertiary)]" />
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {headerRight}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="sm:hidden"
          >
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          </motion.div>
        </div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Status Pipeline ─── */
function StatusPipeline({
  currentStatus,
  onChange,
}: {
  currentStatus: OpportunityStatus;
  onChange: (status: OpportunityStatus) => void;
}) {
  const [confirmStatus, setConfirmStatus] = useState<OpportunityStatus | null>(null);
  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.status === currentStatus);

  const handleClick = (status: OpportunityStatus, index: number) => {
    if (index <= currentIndex) return; // Can't go backwards via click
    if (status === 'accepted') {
      setConfirmStatus(status);
      return;
    }
    onChange(status);
  };

  return (
    <div className="bg-white border border-[var(--border-default)] rounded-2xl shadow-sm overflow-hidden p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-[var(--text-primary)] text-sm">Status</h3>
        <StatusBadge status={currentStatus} />
      </div>

      {/* Desktop: Horizontal Stepper */}
      <div className="hidden sm:block relative">
        {/* Connecting line */}
        <div className="absolute top-[14px] left-[14px] right-[14px] h-[2px] bg-[var(--border-default)] rounded-full" />
        <div
          className="absolute top-[14px] left-[14px] h-[2px] rounded-full transition-all duration-300"
          style={{
            width: currentIndex >= 0 ? `${(currentIndex / (PIPELINE_STEPS.length - 1)) * 100}%` : '0%',
            backgroundColor: STATUS_COLORS[currentStatus],
          }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {PIPELINE_STEPS.map((step, index) => {
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;
            const color = STATUS_COLORS[step.status];

            return (
              <button
                key={step.status}
                onClick={() => handleClick(step.status, index)}
                disabled={index <= currentIndex}
                className={`flex flex-col items-center gap-2 ${
                  index > currentIndex ? 'cursor-pointer hover:opacity-80' : index === currentIndex ? '' : 'cursor-default'
                } transition-opacity`}
              >
                <motion.div
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.1 : 1,
                    backgroundColor: isCompleted ? color : 'transparent',
                    borderColor: isCompleted ? color : 'var(--border-default)',
                  }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  className="w-7 h-7 rounded-full border-2 flex items-center justify-center z-10 relative"
                >
                  {isCompleted && !isCurrent && (
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  )}
                  {isCurrent && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </motion.div>
                <span
                  className={`text-[11px] font-medium ${
                    isCurrent ? 'text-[var(--text-primary)] font-semibold' : isCompleted ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile: Vertical Stepper */}
      <div className="sm:hidden relative pl-3">
        <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-[var(--border-default)] rounded-full" />
        <div
          className="absolute left-[19px] top-2 w-[2px] rounded-full transition-all duration-300"
          style={{
            height: currentIndex >= 0 ? `${(currentIndex / (PIPELINE_STEPS.length - 1)) * 100}%` : '0%',
            backgroundColor: STATUS_COLORS[currentStatus],
          }}
        />
        <div className="space-y-4">
          {PIPELINE_STEPS.map((step, index) => {
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;
            const color = STATUS_COLORS[step.status];

            return (
              <button
                key={step.status}
                onClick={() => handleClick(step.status, index)}
                disabled={index <= currentIndex}
                className={`flex items-center gap-3 w-full text-left ${
                  index > currentIndex ? 'cursor-pointer' : ''
                }`}
              >
                <motion.div
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.15 : 1,
                    backgroundColor: isCompleted ? color : 'transparent',
                    borderColor: isCompleted ? color : 'var(--border-default)',
                  }}
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 z-10"
                >
                  {isCompleted && !isCurrent && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  {isCurrent && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </motion.div>
                <span
                  className={`text-sm ${
                    isCurrent
                      ? 'text-[var(--text-primary)] font-semibold'
                      : isCompleted
                        ? 'text-[var(--text-secondary)]'
                        : 'text-[var(--text-muted)]'
                  }`}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setConfirmStatus(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl"
            >
              <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                Move to {PIPELINE_STEPS.find((s) => s.status === confirmStatus)?.label}?
              </h4>
              <p className="text-sm text-[var(--text-secondary)] mb-5">
                This marks the opportunity as complete. Are you sure?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmStatus(null)}
                  className="btn-secondary flex-1 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onChange(confirmStatus);
                    setConfirmStatus(null);
                  }}
                  className="btn-primary flex-1 text-sm"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── AI Writing Panel ─── */
function AIWritingPanel({ opportunity }: { opportunity: { type: OpportunityType; title: string } }) {
  const navigate = useNavigate();
  const [customPrompt, setCustomPrompt] = useState('');
  const [tone, setTone] = useState<'Professional' | 'Enthusiastic' | 'Technical' | 'Casual'>('Professional');

  const templates = useMemo(() => {
    return AI_TEMPLATES.filter(
      (t) => t.types.includes(opportunity.type) || t.types.length === 7
    );
  }, [opportunity.type]);

  const handleTemplate = (template: string) => {
    navigate('/assistant', {
      state: {
        template,
        opportunity,
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: 0.2,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
      className="bg-white border border-[#c7d2fe] rounded-2xl shadow-[0_1px_3px_rgba(79,70,229,0.06)] overflow-hidden"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-[var(--accent-primary)]" />
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">AI Assistant</h3>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Get help writing your application
        </p>

        {/* Template Grid */}
        <div className="grid grid-cols-2 gap-2">
          {templates.map((tmpl, idx) => (
            <motion.button
              key={tmpl.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.25 + idx * 0.05 }}
              onClick={() => handleTemplate(tmpl.label)}
              className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-[var(--accent-primary)] hover:bg-[#eef2ff] transition-all active:scale-[0.97]"
            >
              <tmpl.icon className="w-5 h-5 text-[var(--accent-primary)]" />
              <span className="text-[11px] font-medium text-[var(--text-primary)] text-center leading-tight">
                {tmpl.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Custom Request */}
        <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
          <label className="text-xs text-[var(--text-secondary)] block mb-2">
            Or describe what you need:
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Help me write a compelling project description..."
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm resize-none focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
          />
          <p className="text-[10px] text-[var(--text-tertiary)] text-right mt-1">
            {customPrompt.length}/500
          </p>

          {/* Tone Selector */}
          <div className="mt-3">
            <label className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium block mb-1.5">
              Tone
            </label>
            <div className="flex gap-1 flex-wrap">
              {(['Professional', 'Enthusiastic', 'Technical', 'Casual'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    tone === t
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={() => {
              if (customPrompt.trim()) {
                navigate('/assistant', {
                  state: {
                    template: 'Custom',
                    customPrompt: customPrompt.trim(),
                    tone,
                    opportunity,
                  },
                });
              }
            }}
            disabled={!customPrompt.trim()}
            className="w-full mt-3 btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            Generate Draft
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Sticky Bottom Actions (mobile) ─── */
function StickyBottomActions({
  url,
  onDelete,
  onEdit,
  onDuplicate,
}: {
  url: string;
  onDelete: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border-default)] px-4 py-3 flex items-center gap-2 z-30 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] lg:hidden">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary flex items-center justify-center gap-2 flex-1 text-sm"
      >
        <ExternalLink className="w-4 h-4" />
        Open Application
      </a>
      <button
        onClick={onEdit}
        className="btn-secondary px-3 py-2.5"
        aria-label="Edit"
      >
        <Edit3 className="w-4 h-4" />
      </button>
      <button
        onClick={onDuplicate}
        className="btn-secondary px-3 py-2.5"
        aria-label="Duplicate"
      >
        <Copy className="w-4 h-4" />
      </button>
      <button
        onClick={onDelete}
        className="btn-ghost px-3 py-2.5 text-[var(--accent-danger)]"
        aria-label="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─── Main Opportunity Detail Page ─── */
export function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const opportunities = useAppStore((s) => s.opportunities);
  const updateOpportunity = useAppStore((s) => s.updateOpportunity);
  const deleteOpportunity = useAppStore((s) => s.deleteOpportunity);
  const moveStatus = useAppStore((s) => s.moveStatus);
  const toggleChecklistItem = useAppStore((s) => s.toggleChecklistItem);
  const addChecklistItem = useAppStore((s) => s.addChecklistItem);
  const updateNotes = useAppStore((s) => s.updateNotes);

  // Find opportunity
  const opportunity = useMemo(() => {
    return opportunities.find((o) => o.id === id);
  }, [opportunities, id]);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    title: string;
    organization: string;
    description: string;
    deadline: string;
    url: string;
    prizes: string;
    location: string;
  }>({
    title: '',
    organization: '',
    description: '',
    deadline: '',
    url: '',
    prizes: '',
    location: '',
  });

  // Checklist state
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Notes state
  const [notesValue, setNotesValue] = useState('');

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Header scroll state
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Sync form state when opportunity loads
  useEffect(() => {
    if (opportunity) {
      setNotesValue(opportunity.notes);
      setEditForm({
        title: opportunity.title,
        organization: opportunity.organization,
        description: opportunity.description,
        deadline: opportunity.deadline || '',
        url: opportunity.url,
        prizes: opportunity.prizes || '',
        location: opportunity.location || '',
      });
    }
  }, [opportunity?.id]);

  if (!opportunity) {
    return (
      <div className="p-6 max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            Opportunity not found
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            The opportunity you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  const completedCount = opportunity.checklist.filter((i) => i.completed).length;
  const totalCount = opportunity.checklist.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleSaveEdit = () => {
    updateOpportunity(opportunity.id, {
      title: editForm.title,
      organization: editForm.organization,
      description: editForm.description,
      deadline: editForm.deadline || null,
      url: editForm.url,
      prizes: editForm.prizes || undefined,
      location: editForm.location || undefined,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteOpportunity(opportunity.id);
    navigate('/');
  };

  const handleDuplicate = () => {
    const newOpp = {
      ...opportunity,
      id: crypto.randomUUID(),
      title: `${opportunity.title} (Copy)`,
      status: 'saved' as OpportunityStatus,
      dateAdded: new Date().toISOString(),
      dateModified: new Date().toISOString(),
    };
    useAppStore.getState().addOpportunity(newOpp);
    navigate(`/opportunity/${newOpp.id}`);
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      addChecklistItem(opportunity.id, newChecklistItem.trim());
      setNewChecklistItem('');
    }
  };

  const handleNotesBlur = () => {
    updateNotes(opportunity.id, notesValue);
  };

  // Fields for key details
  const keyFields = [
    { icon: Calendar, label: 'Deadline', value: opportunity.deadline ? format(parseISO(opportunity.deadline), 'MMM d, yyyy') : 'No deadline', isMono: true },
    { icon: Trophy, label: 'Prize', value: opportunity.prizes || 'N/A' },
    { icon: MapPin, label: 'Location', value: opportunity.location || 'Not specified' },
    { icon: Users, label: 'Eligibility', value: opportunity.requirements?.length > 0 ? opportunity.requirements.join(', ') : 'Open to all' },
    { icon: Tag, label: 'Type', value: <TypeBadge type={opportunity.type} /> },
    { icon: Building2, label: 'Organization', value: opportunity.organization },
    { icon: Link2, label: 'Source', value: opportunity.url, isLink: true },
    { icon: Clock, label: 'Date Added', value: format(parseISO(opportunity.dateAdded), 'MMM d, yyyy'), isMono: true },
    { icon: RefreshCw, label: 'Last Updated', value: opportunity.dateModified ? format(parseISO(opportunity.dateModified), "MMM d, yyyy 'at' h:mm a") : 'Never', isMono: true },
  ];

  return (
    <div className="min-h-[100dvh] pb-24 lg:pb-6">
      {/* Sticky Top Bar */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={`sticky top-0 z-10 transition-all duration-200 ${
          scrolled
            ? 'bg-[var(--bg-primary)]/90 backdrop-blur-xl border-b border-[var(--border-default)]'
            : 'bg-transparent'
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 max-w-[1200px] mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>

          {/* Center: truncated title on mobile */}
          <span className="sm:hidden text-sm font-medium text-[var(--text-primary)] truncate max-w-[200px]">
            {opportunity.title}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setIsEditing(true);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>
      </motion.header>

      <div className="px-4 lg:px-6 pt-2 max-w-[1200px] mx-auto">
        <div className="lg:flex lg:gap-6">
          {/* Main Column */}
          <div className="lg:flex-[0.58] space-y-3">
            {/* Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
              className="bg-white border border-[var(--border-default)] rounded-2xl shadow-sm p-5 sm:p-8"
            >
              {/* Type + Edit */}
              <div className="flex items-start justify-between mb-3">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05, duration: 0.2 }}
                >
                  <TypeBadge type={opportunity.type} />
                </motion.div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="sm:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)]"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.25 }}
                className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] leading-tight mb-1"
              >
                {opportunity.title}
              </motion.h1>

              {/* Organization */}
              <p className="text-sm sm:text-base text-[var(--text-secondary)] mb-4">
                <span className="text-[var(--text-tertiary)]">Organized by</span>{' '}
                <span className="font-medium">{opportunity.organization}</span>
              </p>

              {/* URL Row */}
              <div className="flex items-center gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <Globe className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                <a
                  href={opportunity.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs sm:text-sm font-mono text-[var(--accent-primary)] truncate flex-1 hover:underline"
                >
                  {opportunity.url}
                </a>
                <a
                  href={opportunity.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Deadline badge below title on mobile */}
              <div className="mt-4 sm:hidden">
                <DeadlineBadge deadline={opportunity.deadline} />
              </div>
            </motion.div>

            {/* Key Details Card */}
            <CollapsibleCard
              title="Key Details"
              icon={Tag}
              defaultExpanded={false}
            >
              <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-3">
                {keyFields.map((field, idx) => (
                  <motion.div
                    key={field.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.2 }}
                    className="contents"
                  >
                    <div className="flex items-center gap-2 text-right">
                      <field.icon className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                      <span className="text-[11px] text-[var(--text-tertiary)] font-medium min-w-[80px] text-right">
                        {field.label}
                      </span>
                    </div>
                    <div className={`text-sm ${field.isMono ? 'font-mono text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'} ${field.isLink ? 'text-[var(--accent-primary)] truncate' : ''}`}>
                      {field.isLink ? (
                        <a href={field.value as string} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {(field.value as string).replace(/^https?:\/\//, '').slice(0, 40)}
                          {(field.value as string).replace(/^https?:\/\//, '').length > 40 ? '...' : ''}
                        </a>
                      ) : (
                        field.value as React.ReactNode
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CollapsibleCard>

            {/* Status Pipeline */}
            <StatusPipeline
              currentStatus={opportunity.status}
              onChange={(status) => moveStatus(opportunity.id, status)}
            />

            {/* Checklist Card */}
            <CollapsibleCard
              title="Checklist"
              icon={CheckSquare}
              headerRight={
                totalCount > 0 ? (
                  <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
                    {completedCount}/{totalCount}
                  </span>
                ) : undefined
              }
              defaultExpanded={true}
            >
              {/* Progress Bar */}
              {totalCount > 0 && (
                <div className="mb-4">
                  <div className="h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                    <motion.div
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                      className="h-full rounded-full bg-[var(--accent-primary)]"
                    />
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-mono">
                    {Math.round(progress)}% complete
                  </p>
                </div>
              )}

              {/* Items */}
              <div className="space-y-0">
                <AnimatePresence mode="popLayout">
                  {opportunity.checklist.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-3 py-2.5 border-b border-[var(--border-subtle)] last:border-0 group"
                    >
                      <button
                        onClick={() => toggleChecklistItem(opportunity.id, item.id)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                          item.completed
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]'
                            : 'border-[var(--border-default)] hover:border-[var(--accent-primary)]'
                        }`}
                      >
                        {item.completed && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 15 }}
                          >
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          </motion.div>
                        )}
                      </button>
                      <span
                        className={`text-sm flex-1 transition-all ${
                          item.completed
                            ? 'text-[var(--text-tertiary)] line-through'
                            : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {item.text}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Add Item */}
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddChecklistItem();
                  }}
                  placeholder="Add a task..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                />
                <button
                  onClick={handleAddChecklistItem}
                  disabled={!newChecklistItem.trim()}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--accent-primary)] hover:bg-[#eef2ff] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </CollapsibleCard>

            {/* Notes Card */}
            <CollapsibleCard
              title="Notes"
              icon={FileText}
              headerRight={
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  {notesValue.length} chars
                </span>
              }
              defaultExpanded={true}
            >
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Write your notes, ideas, and research here..."
                rows={6}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm resize-none focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all min-h-[150px]"
              />
            </CollapsibleCard>

            {/* AI Panel (mobile only - in scroll flow) */}
            <div className="lg:hidden">
              <AIWritingPanel opportunity={{ type: opportunity.type, title: opportunity.title }} />
            </div>
          </div>

          {/* Right Column: AI Panel (desktop sticky) */}
          <div className="hidden lg:block lg:flex-[0.38]">
            <div className="sticky top-[72px]">
              <AIWritingPanel opportunity={{ type: opportunity.type, title: opportunity.title }} />

              {/* Quick Actions (desktop) */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.3 }}
                className="mt-4 bg-white border border-[var(--border-default)] rounded-2xl shadow-sm p-5"
              >
                <h3 className="font-semibold text-[var(--text-primary)] text-sm mb-3">Actions</h3>
                <div className="space-y-2">
                  <a
                    href={opportunity.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full btn-primary flex items-center justify-center gap-2 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Application
                  </a>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full btn-secondary flex items-center justify-center gap-2 text-sm"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Details
                  </button>
                  <button
                    onClick={handleDuplicate}
                    className="w-full btn-secondary flex items-center justify-center gap-2 text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--accent-danger)] hover:bg-[#fff1f2] transition-colors border border-transparent hover:border-[#fecdd3]"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions (mobile) */}
      <StickyBottomActions
        url={opportunity.url}
        onDelete={() => setShowDeleteConfirm(true)}
        onEdit={() => setIsEditing(true)}
        onDuplicate={handleDuplicate}
      />

      {/* Edit Mode Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          >
            <div
              onClick={() => {
                setIsEditing(false);
                setEditForm({
                  title: opportunity.title,
                  organization: opportunity.organization,
                  description: opportunity.description,
                  deadline: opportunity.deadline || '',
                  url: opportunity.url,
                  prizes: opportunity.prizes || '',
                  location: opportunity.location || '',
                });
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
            >
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-[var(--border-default)]" />
              </div>

              <div className="px-5 pb-6 pt-2">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Edit Opportunity</h3>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({
                        title: opportunity.title,
                        organization: opportunity.organization,
                        description: opportunity.description,
                        deadline: opportunity.deadline || '',
                        url: opportunity.url,
                        prizes: opportunity.prizes || '',
                        location: opportunity.location || '',
                      });
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Title</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Organization</label>
                    <input
                      type="text"
                      value={editForm.organization}
                      onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={4}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm resize-none focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Deadline</label>
                      <input
                        type="date"
                        value={editForm.deadline}
                        onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Prize</label>
                      <input
                        type="text"
                        value={editForm.prizes}
                        onChange={(e) => setEditForm({ ...editForm, prizes: e.target.value })}
                        placeholder="e.g., $25,000"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Location</label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">URL</label>
                    <input
                      type="url"
                      value={editForm.url}
                      onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                    />
                  </div>
                </div>

                <div className="pt-5 flex gap-3">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({
                        title: opportunity.title,
                        organization: opportunity.organization,
                        description: opportunity.description,
                        deadline: opportunity.deadline || '',
                        url: opportunity.url,
                        prizes: opportunity.prizes || '',
                        location: opportunity.location || '',
                      });
                    }}
                    className="btn-secondary flex-1 text-sm"
                  >
                    Cancel
                  </button>
                  <button onClick={handleSaveEdit} className="btn-primary flex-1 text-sm">
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl"
            >
              <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                Delete Opportunity?
              </h4>
              <p className="text-sm text-[var(--text-secondary)] mb-5">
                This will permanently delete &ldquo;{opportunity.title}&rdquo;. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary flex-1 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--accent-danger)] text-white hover:opacity-90 transition-opacity"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
