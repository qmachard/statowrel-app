import type { DateKey } from '@/lib/dates';

/** The four calendar states of docs/prd.md §5.2. */
export type CalendarDayState = 'answered' | 'today' | 'missed' | 'idle';

export interface CalendarDayStateInput {
  day: DateKey;
  today: DateKey;
  /** Day the account was created — everything before it is inert. */
  registeredOn: DateKey;
  answeredDays: Set<DateKey>;
}

/**
 * `YYYY-MM-DD` keys sort lexicographically, which is what lets past and future
 * be plain string comparisons instead of `Date` arithmetic.
 */
export const getCalendarDayState = ({ day, today, registeredOn, answeredDays }: CalendarDayStateInput): CalendarDayState => {
  if (answeredDays.has(day)) {
    return 'answered';
  }

  if (day === today) {
    return 'today';
  }

  if (day > today || day < registeredOn) {
    return 'idle';
  }

  return 'missed';
};
