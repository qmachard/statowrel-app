import type { DateKey } from '@/lib/dates';

/** The four calendar states of docs/prd.md §5.2. */
export type CalendarDayState = 'answered' | 'today' | 'missed' | 'idle';

export interface CalendarDayStateInput {
  day: DateKey;
  today: DateKey;
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
 *
 * **The account's own age is not a bound.** Every broadcast day is catch-up-able,
 * including the ones that predate the account: somebody arriving today opens the
 * whole archive and answers it in late mode (docs/prd.md §4.2) — the answers are
 * `late: true`, so they build the collection without ever moving a streak.
 *
 * **Today is `today` whatever happens to it**, answered or not: it is the one
 * day the screen is about, and letting it turn yellow like any other answered
 * day dissolved it into the month the moment one had played. It keeps the
 * treatment of an answered cell — `stat_label` included — and only its colour
 * differs (docs/prd.md §5.2).
 */
export const getCalendarDayState = ({ day, today, published, answered }: CalendarDayStateInput): CalendarDayState => {
  if (answered) {
    return day === today ? 'today' : 'answered';
  }

  if (!published || day > today) {
    return 'idle';
  }

  return day === today ? 'today' : 'missed';
};
