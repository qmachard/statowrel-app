/**
 * Pure date helpers for the Stats calendar (docs/prd.md §5.2).
 *
 * Days are keyed by their local `YYYY-MM-DD` string — the same key
 * `v1_daily_questions` uses as a document id and `v1_daily_question_answers`
 * denormalizes into its `date` field, so a grid cell and an answer compare
 * directly, with no timezone arithmetic in between.
 */

/** Monday-first, matching how the grid is laid out. */
export const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

const MONTH_LABELS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const;

/** A year/month pair, month being 0-indexed like `Date.getMonth()`. */
export interface MonthCursor {
  year: number;
  month: number;
}

/**
 * `YYYY-MM-DD` in the device's local time.
 *
 * Not `toISOString()`: that converts to UTC first, which shifts the day for
 * anyone east of Greenwich in the evening and west of it in the morning.
 */
export function toDayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

export function toMonthCursor(date: Date): MonthCursor {
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function addMonths({ year, month }: MonthCursor, delta: number): MonthCursor {
  const shifted = new Date(year, month + delta, 1);

  return toMonthCursor(shifted);
}

/** Negative when `a` is before `b`, 0 when they are the same month. */
export function compareMonths(a: MonthCursor, b: MonthCursor): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

export function formatMonthLabel({ year, month }: MonthCursor): string {
  return `${MONTH_LABELS[month]} ${year}`;
}

/**
 * The month laid out as weeks of 7 slots, Monday first. Slots before the 1st
 * and after the last day are `null` so the grid keeps its 7 columns.
 */
export function buildMonthGrid({ year, month }: MonthCursor): (Date | null)[][] {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // getDay() is Sunday-first (0); shift it so Monday is 0.
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;

  const slots: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
  ];

  while (slots.length % 7 !== 0) {
    slots.push(null);
  }

  return Array.from({ length: slots.length / 7 }, (_, week) => slots.slice(week * 7, week * 7 + 7));
}
