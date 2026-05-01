import type { OpportunityType } from '@/types';

const typeStyles: Record<OpportunityType, { bg: string; text: string; border: string; label: string }> = {
  hackathon: { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe', label: 'Hackathon' },
  accelerator: { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe', label: 'Accelerator' },
  grant: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0', label: 'Grant' },
  government: { bg: '#fef3c7', text: '#92400e', border: '#fde68a', label: 'Government' },
  platform: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe', label: 'Platform' },
  job: { bg: '#ffe4e6', text: '#9f1239', border: '#fecdd3', label: 'Job' },
  other: { bg: '#f5f5f4', text: '#57534e', border: '#e7e5e4', label: 'Other' },
};

interface TypeBadgeProps {
  type: OpportunityType;
  className?: string;
}

export function TypeBadge({ type, className = '' }: TypeBadgeProps) {
  const style = typeStyles[type];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${className}`}
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      {style.label}
    </span>
  );
}
