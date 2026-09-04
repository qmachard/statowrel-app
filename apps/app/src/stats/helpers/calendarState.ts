import type { DateKey } from '@/lib/dates';

/** The five calendar states of docs/prd.md §5.2, with `jokered` added in §4.8. */
export type CalendarDayState = 'answered' | 'jokered' | 'today' | 'missed' | 'idle';

export interface CalendarDayStateInput {
  day: DateKey;
  today: DateKey;
  /** A question was broadcast that day — read off `v1_daily_question_months`. */
  published: boolean;
  /** The user answered it — read off `v1_users/{uid}/v1_user_calendar_months`. */
  answered: boolean;
  /**
   * The user passed the day with a joker — read off the same document
   * (`v1_user_calendar_months.jokers`). A day never appears as both
   * `answered` and `jokered` (the callable that writes a joker refuses to
   * when a day has already been answered, and the answer path refuses when a
   * joker has landed the same day). Wins over every other state — today
   * included — so a jokered cell always reads as the joker it is.
   */
  jokered: boolean;
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
 * treatment of an answered cell — the check included, once it is played — and
 * only its colour differs (docs/prd.md §5.2).
 */
export const getCalendarDayState = ({ day, today, published, answered, jokered }: CalendarDayStateInput): CalendarDayState => {
  // A joker overrides today, on purpose: the whole point of the violet is
  // that it says « passé avec un joker » at a glance, and letting today's
  // accent red win over it would hide the very state the user just paid to
  // reach. An answered today keeps its red — nothing to show about the day
  // beyond « c'est aujourd'hui ».
  if (jokered) {
    return 'jokered';
  }

  if (answered) {
    return day === today ? 'today' : 'answered';
  }

  if (!published || day > today) {
    return 'idle';
  }

  return day === today ? 'today' : 'missed';
};
