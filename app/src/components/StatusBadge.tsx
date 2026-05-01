import type { OpportunityStatus } from '@/types';

const statusStyles: Record<OpportunityStatus, { color: string; bg: string; label: string }> = {
  saved: { color: '#6b7280', bg: '#f3f4f6', label: 'Saved' },
  researching: { color: '#3b82f6', bg: '#eff6ff', label: 'Researching' },
  preparing: { color: '#f59e0b', bg: '#fffbeb', label: 'Preparing' },
  applied: { color: '#4f46e5', bg: '#eef2ff', label: 'Applied' },
  interview: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Interview' },
  accepted: { color: '#10b981', bg: '#ecfdf5', label: 'Accepted' },
  rejected: { color: '#f43f5e', bg: '#fff1f2', label: 'Rejected' },
  declined: { color: '#6b7280', bg: '#f3f4f6', label: 'Declined' },
};

interface StatusBadgeProps {
  status: OpportunityStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const style = statusStyles[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${className}`}
      style={{
        backgroundColor: style.bg,
        color: style.color,
      }}
    >
      {style.label}
    </span>
  );
}
