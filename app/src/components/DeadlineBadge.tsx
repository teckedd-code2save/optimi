import { differenceInDays, format, isPast, parseISO } from 'date-fns';

interface DeadlineBadgeProps {
  deadline: string | null;
  className?: string;
}

export function DeadlineBadge({ deadline, className = '' }: DeadlineBadgeProps) {
  if (!deadline) {
    return (
      <span className={`text-xs text-[var(--text-muted)] font-medium ${className}`}>
        No deadline
      </span>
    );
  }

  const date = parseISO(deadline);
  const now = new Date();
  const daysLeft = differenceInDays(date, now);
  const isOverdue = isPast(date) && daysLeft < 0;

  let colorClass = 'text-[var(--text-tertiary)]';
  let bgClass = 'bg-[var(--bg-elevated)]';

  if (isOverdue) {
    colorClass = 'text-[var(--accent-danger)]';
    bgClass = 'bg-[#fff1f2]';
  } else if (daysLeft < 3) {
    colorClass = 'text-[var(--accent-danger)]';
    bgClass = 'bg-[#fff1f2]';
  } else if (daysLeft < 7) {
    colorClass = 'text-[var(--accent-warning)]';
    bgClass = 'bg-[#fffbeb]';
  }

  let label = format(date, 'MMM d, yyyy');
  if (isOverdue) {
    label = `${Math.abs(daysLeft)}d overdue`;
  } else if (daysLeft === 0) {
    label = 'Due today';
  } else if (daysLeft === 1) {
    label = '1 day left';
  } else if (daysLeft < 30) {
    label = `${daysLeft}d left`;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold font-mono ${bgClass} ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}
