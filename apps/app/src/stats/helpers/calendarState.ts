import type { DateKey } from '@/lib/dates';

/** The four calendar states of docs/prd.md §5.2. */
export type CalendarDayState = 'answered' | 'today' | 'missed' | 'idle';

export interface CalendarDayStateInput {
  day: DateKey;
  today: DateKey;
  /** Day the account was created — everything before it is inert. */
  registeredOn: DateKey;
  /** A question was broadcast that day — read off `v1_daily_question_months`. */
  published: boolean;
  /** The user answered it — read off `v1_users/{uid}/v1_user_calendar_months`. */
  answered: boolean;
}

/**
 * `YYYY-MM-DD` keys sort lexicographically, which is what lets past and future
 * be plain string comparisons instead of `Date` arithmetic.
 *
 * A day nobody ever broadcast a question on — before the launch, or a
 * publication incident — is inert rather than missed (docs/prd.md §5.2): there
 * is nothing there to catch up on. Which is also true of today before the 07:00
 * drop.
 */
export const getCalendarDayState = ({ day, today, registeredOn, published, answered }: CalendarDayStateInput): CalendarDayState => {
  if (answered) {
    return 'answered';
  }

  if (!published || day > today || day < registeredOn) {
    return 'idle';
  }

  return day === today ? 'today' : 'missed';
};
