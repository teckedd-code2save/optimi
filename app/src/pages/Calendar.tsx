import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  differenceInDays,
  isPast,
  parseISO,
  startOfDay,
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { TypeBadge } from '@/components/TypeBadge';
import type { Opportunity } from '@/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type CalendarView = 'month' | 'week' | 'list';

const springEase = [0.16, 1, 0.3, 1] as [number, number, number, number];

function getUrgencyColor(deadline: string): string {
  const date = parseISO(deadline);
  const daysLeft = differenceInDays(date, new Date());
  if (daysLeft < 3) return 'var(--accent-danger)';
  if (daysLeft < 7) return 'var(--accent-warning)';
  return 'var(--accent-primary)';
}

function getUrgencyClass(deadline: string): string {
  const date = parseISO(deadline);
  const daysLeft = differenceInDays(date, new Date());
  if (daysLeft < 3) return 'bg-[#f43f5e]';
  if (daysLeft < 7) return 'bg-[#f59e0b]';
  return 'bg-[#4f46e5]';
}

function getUrgencyTextColor(deadline: string): string {
  const date = parseISO(deadline);
  const daysLeft = differenceInDays(date, new Date());
  if (daysLeft < 3) return 'text-rose-500';
  if (daysLeft < 7) return 'text-amber-500';
  return 'text-[var(--accent-primary)]';
}

function getDaysLeftLabel(deadline: string): string {
  const date = parseISO(deadline);
  const now = new Date();
  const daysLeft = differenceInDays(date, now);
  if (isPast(date) && daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
  if (daysLeft === 0) return 'Due today';
  if (daysLeft === 1) return '1 day';
  return `${daysLeft} days`;
}

function generateICS(opportunities: Opportunity[]): string {
  const now = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
  const events = opportunities
    .filter((o) => o.deadline !== null)
    .map((o) => {
      const date = parseISO(o.deadline!);
      const dateStr = format(startOfDay(date), 'yyyyMMdd');
      return [
        'BEGIN:VEVENT',
        `UID:optimi-${o.id}@optimi.app`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${dateStr}`,
        `SUMMARY:[Optimi] ${o.title}`,
        `DESCRIPTION:${o.organization} - ${o.type}${o.url ? `\\n${o.url}` : ''}`,
        o.url ? `URL:${o.url}` : '',
        `CATEGORIES:${o.type}`,
        'END:VEVENT',
      ].join('\n');
    })
    .join('\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Optimi//Deadline Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    events,
    'END:VCALENDAR',
  ].join('\n');
}

export function Calendar() {
  const navigate = useNavigate();
  const { opportunities, settings } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const deadlinesOnly = useMemo(
    () => opportunities.filter((o) => o.deadline !== null),
    [opportunities]
  );

  const getOppsForDay = useCallback(
    (day: Date) => {
      const dayStr = format(startOfDay(day), 'yyyy-MM-dd');
      return deadlinesOnly.filter((o) => {
        if (!o.deadline) return false;
        return format(startOfDay(parseISO(o.deadline)), 'yyyy-MM-dd') === dayStr;
      });
    },
    [deadlinesOnly]
  );

  // Month grid data
  const monthGridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Week view data
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // List view data
  const sortedDeadlines = useMemo(() => {
    return [...deadlinesOnly].sort((a, b) => {
      return new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime();
    });
  }, [deadlinesOnly]);

  const thisWeekDeadlines = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return deadlinesOnly
      .filter((o) => {
        if (!o.deadline) return false;
        const d = parseISO(o.deadline);
        return d >= start && d <= end;
      })
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  }, [deadlinesOnly]);

  const handleExportICS = () => {
    const ics = generateICS(opportunities);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const monthLabel = format(currentDate, 'MMMM-yyyy');
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimi-deadlines-${monthLabel}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: springEase }}
        className="mb-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-[var(--accent-primary)]" />
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Calendar</h1>
          </div>
          <div className="flex items-center gap-2">
            {settings.googleConnected ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-sm font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Synced
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 text-sm">
                <span className="inline-flex rounded-full h-2 w-2 bg-gray-400" />
                <span
                  className="cursor-pointer hover:text-[var(--accent-primary)]"
                  onClick={() => navigate('/settings')}
                >
                  Connect Google Calendar
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Navigation Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--border-default)] mb-3"
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              setView((v) => {
                if (v === 'month') {
                  setCurrentDate((d) => subMonths(d, 1));
                  return v;
                }
                if (v === 'week') {
                  setCurrentDate((d) => subWeeks(d, 1));
                  return v;
                }
                setCurrentDate((d) => subMonths(d, 1));
                return v;
              })
            }
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] transition-colors active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <span className="text-base font-semibold text-[var(--text-primary)] min-w-[140px] text-center select-none">
            {view === 'week'
              ? `${format(weekDays[0], 'MMM d')} - ${format(weekDays[6], 'MMM d, yyyy')}`
              : format(currentDate, 'MMMM yyyy')}
          </span>
          <button
            onClick={() =>
              setView((v) => {
                if (v === 'month') {
                  setCurrentDate((d) => addMonths(d, 1));
                  return v;
                }
                if (v === 'week') {
                  setCurrentDate((d) => addWeeks(d, 1));
                  return v;
                }
                setCurrentDate((d) => addMonths(d, 1));
                return v;
              })
            }
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] transition-colors active:scale-95"
          >
            <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            disabled={isToday(startOfDay(currentDate))}
            className="ml-2 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:border-[var(--accent-primary)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Today
          </button>
        </div>

        <div className="flex items-center gap-1 bg-[var(--bg-elevated)] rounded-lg p-[3px]">
          {(['month', 'week', 'list'] as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                view === v
                  ? 'bg-white text-[var(--accent-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {view === 'month' && (
              <motion.div
                key="month"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {/* Day of Week Header */}
                <div className="grid grid-cols-7 gap-px bg-[var(--border-subtle)] rounded-t-xl overflow-hidden">
                  {dayNames.map((d) => (
                    <div
                      key={d}
                      className="bg-[var(--bg-elevated)] py-2.5 text-center text-xs font-semibold text-[var(--text-tertiary)] uppercase"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-px bg-[var(--border-subtle)] rounded-b-xl overflow-hidden">
                  {monthGridDays.map((day, idx) => {
                    const dayOpps = getOppsForDay(day);
                    const hasDeadlines = dayOpps.length > 0;
                    const isCurrentMonth = isSameMonth(day, currentDate);

                    return (
                      <motion.div
                        key={day.toISOString()}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.005, duration: 0.15 }}
                        onClick={() => {
                          if (hasDeadlines) setSelectedDay(day);
                        }}
                        className={`bg-[var(--bg-card)] min-h-[64px] sm:min-h-[80px] p-1.5 sm:p-2 relative cursor-default transition-colors ${
                          isCurrentMonth ? '' : 'opacity-50'
                        } ${hasDeadlines ? 'hover:bg-[var(--bg-hover)] cursor-pointer' : ''}`}
                        style={
                          hasDeadlines
                            ? {
                                borderLeft: `2px solid ${getUrgencyColor(dayOpps[0].deadline!)}`,
                                backgroundColor: `${getUrgencyColor(dayOpps[0].deadline!)}08`,
                              }
                            : undefined
                        }
                      >
                        <div className="flex items-center justify-between">
                          {isToday(day) ? (
                            <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center text-xs sm:text-sm font-bold">
                              {format(day, 'd')}
                            </span>
                          ) : (
                            <span
                              className={`text-xs sm:text-sm font-medium ${
                                isCurrentMonth
                                  ? 'text-[var(--text-primary)]'
                                  : 'text-[var(--text-muted)]'
                              }`}
                            >
                              {format(day, 'd')}
                            </span>
                          )}
                        </div>

                        {hasDeadlines && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {dayOpps.slice(0, 4).map((opp) => (
                              <motion.span
                                key={opp.id}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                  delay: idx * 0.005 + 0.05,
                                  duration: 0.2,
                                  ease: springEase,
                                }}
                                className={`inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${getUrgencyClass(
                                  opp.deadline!
                                )}`}
                              />
                            ))}
                            {dayOpps.length > 4 && (
                              <span className="text-[9px] text-[var(--text-tertiary)] leading-none">
                                +{dayOpps.length - 4}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Desktop labels */}
                        <div className="hidden lg:block mt-1 space-y-0.5">
                          {dayOpps.slice(0, 2).map((opp) => (
                            <p
                              key={opp.id}
                              className={`text-[10px] truncate leading-tight ${getUrgencyTextColor(
                                opp.deadline!
                              )}`}
                            >
                              {opp.title}
                            </p>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {view === 'week' && (
              <motion.div
                key="week"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-2"
              >
                {weekDays.map((day, idx) => {
                  const dayOpps = getOppsForDay(day);
                  const isTodayDay = isToday(day);
                  return (
                    <motion.div
                      key={day.toISOString()}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.2, ease: springEase }}
                      className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {format(day, 'EEEE, MMMM d')}
                        </span>
                        {isTodayDay && (
                          <span className="px-2 py-0.5 rounded-full bg-[var(--accent-primary-subtle, #e0e7ff)] text-xs font-medium text-[var(--accent-primary)]">
                            Today
                          </span>
                        )}
                      </div>

                      {dayOpps.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)] py-2">No deadlines</p>
                      ) : (
                        <div className="space-y-2">
                          {dayOpps.map((opp) => (
                            <div
                              key={opp.id}
                              onClick={() => navigate(`/opportunity/${opp.id}`)}
                              className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                            >
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${getUrgencyClass(
                                  opp.deadline!
                                )}`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                  {opp.title}
                                </p>
                                <p className="text-xs text-[var(--text-tertiary)]">
                                  {opp.organization}
                                </p>
                              </div>
                              <TypeBadge type={opp.type} />
                              <span
                                className={`text-xs font-mono ${getUrgencyTextColor(
                                  opp.deadline!
                                )}`}
                              >
                                {getDaysLeftLabel(opp.deadline!)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {view === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-1"
              >
                {sortedDeadlines.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
                    <p className="text-sm text-[var(--text-muted)]">No upcoming deadlines</p>
                  </div>
                ) : (
                  (() => {
                    let currentMonth = '';
                    return sortedDeadlines.map((opp, idx) => {
                      const monthLabel = format(parseISO(opp.deadline!), 'MMMM yyyy');
                      const showMonthHeader = monthLabel !== currentMonth;
                      currentMonth = monthLabel;
                      return (
                        <div key={opp.id}>
                          {showMonthHeader && (
                            <h3 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wide pt-4 pb-2 px-1">
                              {monthLabel}
                            </h3>
                          )}
                          <motion.div
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03, duration: 0.2, ease: springEase }}
                            onClick={() => navigate(`/opportunity/${opp.id}`)}
                            className="flex items-center gap-3 py-3 px-4 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl hover:bg-[var(--bg-hover)] cursor-pointer transition-colors mb-2"
                          >
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${getUrgencyClass(
                                opp.deadline!
                              )}`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                {opp.title}
                              </p>
                              <p className="text-xs text-[var(--text-tertiary)]">
                                {opp.organization}
                              </p>
                            </div>
                            <TypeBadge type={opp.type} />
                            <span className="text-xs text-[var(--text-tertiary)] font-mono shrink-0">
                              {format(parseISO(opp.deadline!), 'MMM d')}
                            </span>
                            <span
                              className={`text-xs font-mono font-semibold shrink-0 min-w-[60px] text-right ${getUrgencyTextColor(
                                opp.deadline!
                              )}`}
                            >
                              {getDaysLeftLabel(opp.deadline!)}
                            </span>
                          </motion.div>
                        </div>
                      );
                    });
                  })()
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar — This Week's Deadlines */}
        <motion.aside
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.1, ease: springEase }}
          className="w-full lg:w-80 shrink-0"
        >
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 lg:sticky lg:top-[72px]">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-[var(--text-tertiary)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                This Week's Deadlines
              </h2>
              <span className="ml-auto text-xs font-mono text-[var(--text-tertiary)]">
                {thisWeekDeadlines.length}
              </span>
            </div>

            {thisWeekDeadlines.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-[var(--accent-success)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-muted)]">No deadlines this week</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">You&apos;re all caught up!</p>
              </div>
            ) : (
              <div className="space-y-0">
                {thisWeekDeadlines.map((opp, idx) => (
                  <motion.div
                    key={opp.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.2, ease: springEase }}
                    onClick={() => navigate(`/opportunity/${opp.id}`)}
                    className="py-3 border-b border-[var(--border-subtle)] last:border-0 cursor-pointer hover:bg-[var(--bg-hover)] -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getUrgencyClass(
                          opp.deadline!
                        )}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[var(--text-tertiary)]">
                            {format(parseISO(opp.deadline!), 'MMM d')}
                          </span>
                          <span
                            className={`text-xs font-mono ml-auto ${getUrgencyTextColor(
                              opp.deadline!
                            )}`}
                          >
                            {getDaysLeftLabel(opp.deadline!)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate mt-0.5">
                          {opp.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <TypeBadge type={opp.type} />
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            {opp.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex flex-wrap gap-2">
              <button
                onClick={() => navigate('/settings')}
                className="btn-secondary text-sm flex items-center gap-1.5 px-3 py-2"
              >
                {settings.googleConnected ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Sync now
                  </>
                ) : (
                  <>
                    <CalendarIcon className="w-3.5 h-3.5" />
                    Connect Google Calendar
                  </>
                )}
              </button>
              <button
                onClick={handleExportICS}
                className="btn-secondary text-sm flex items-center gap-1.5 px-3 py-2"
              >
                <Download className="w-3.5 h-3.5" />
                Export .ics
              </button>
            </div>
          </div>
        </motion.aside>
      </div>

      {/* Mobile Day Detail Sheet */}
      <Sheet open={selectedDay !== null} onOpenChange={() => setSelectedDay(null)}>
        <SheetContent side="bottom" className="max-h-[60vh] rounded-t-[20px]">
          <SheetHeader className="pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg">
                {selectedDay ? format(selectedDay, 'EEEE, MMMM d') : ''}
              </SheetTitle>
              <button
                onClick={() => setSelectedDay(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)] transition-colors"
              >
                <X className="w-4 h-4 text-[var(--text-tertiary)]" />
              </button>
            </div>
          </SheetHeader>
          <div className="space-y-2 pb-4">
            {selectedDay &&
              (() => {
                const dayOpps = getOppsForDay(selectedDay);
                if (dayOpps.length === 0) {
                  return (
                    <p className="text-sm text-[var(--text-muted)] text-center py-6">
                      No deadlines on this day
                    </p>
                  );
                }
                return dayOpps.map((opp) => (
                  <div
                    key={opp.id}
                    className="p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`w-2 h-2 rounded-full ${getUrgencyClass(opp.deadline!)}`}
                      />
                      <TypeBadge type={opp.type} />
                      <span
                        className={`text-xs font-mono ml-auto ${getUrgencyTextColor(
                          opp.deadline!
                        )}`}
                      >
                        {getDaysLeftLabel(opp.deadline!)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                      {opp.title}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] mb-3">{opp.organization}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedDay(null);
                          navigate(`/opportunity/${opp.id}`);
                        }}
                        className="btn-primary text-xs px-3 py-1.5 flex-1"
                      >
                        View Details
                      </button>
                      {opp.url && (
                        <button
                          onClick={() => window.open(opp.url, '_blank')}
                          className="btn-secondary text-xs px-3 py-1.5 flex-1"
                        >
                          Open Source
                        </button>
                      )}
                    </div>
                  </div>
                ));
              })()}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
