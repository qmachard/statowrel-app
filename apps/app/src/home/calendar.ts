import type { DailyQuestionAnswerData } from '@statowrel/models';

/**
 * The four states of a calendar cell — docs/prd.md §5.2.
 *
 * `inert` covers both ends of the timeline: a future day and any day before the
 * account existed. Neither is something the user can act on, so neither earns a
 * distinct rendering.
 */
export type CalendarDayState = 'answered' | 'missed' | 'today' | 'inert';

export interface CalendarDay {
  /** `YYYY-MM-DD`, the same key the answers carry (docs/prd.md §6). */
  date: string;
  dayOfMonth: number;
  state: CalendarDayState;
  /** The answer behind an `answered` cell, null for every other state. */
  answer: DailyQuestionAnswerData | null;
}

/** A month, identified the way `Date` counts them: `month` is 0-indexed. */
export interface CalendarMonth {
  year: number;
  month: number;
}

export interface MonthGrid {
  month: CalendarMonth;
  /** Weeks of seven slots, Monday first. `null` pads the first and last week. */
  weeks: (CalendarDay | null)[][];
}

/** Monday first — the app is French, and the streak reads as a week of work. */
export const WEEKDAY_INITIALS = [ 'L', 'M', 'M', 'J', 'V', 'S', 'D' ] as const;

const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
] as const;

/**
 * `YYYY-MM-DD` in the device's own timezone.
 *
 * v1 puts everybody on Europe/Paris (docs/prd.md §7), so the device clock is
 * the day boundary until a real timezone conversion is needed — which is a
 * change to this function alone, not to the calendar.
 */
export const toDayKey = (date: Date): string => [
  String(date.getFullYear()).padStart(4, '0'),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

/** Midnight of the day `date` falls on, in the device's timezone. */
export const startOfDay = (date: Date): Date => (
  new Date(date.getFullYear(), date.getMonth(), date.getDate())
);

export const toCalendarMonth = (date: Date): CalendarMonth => ({
  year: date.getFullYear(),
  month: date.getMonth(),
});

export const addMonths = ({ year, month }: CalendarMonth, delta: number): CalendarMonth => {
  const shifted = new Date(year, month + delta, 1);

  return toCalendarMonth(shifted);
};

/** Negative when `a` precedes `b`, positive when it follows it, 0 when equal. */
export const compareMonths = (a: CalendarMonth, b: CalendarMonth): number => (
  a.year === b.year ? a.month - b.month : a.year - b.year
);

export const formatMonthLabel = ({ year, month }: CalendarMonth): string => (
  `${MONTH_NAMES[month]} ${year}`
);

/** Monday-first weekday index of a date: 0 for Monday, 6 for Sunday. */
const weekdayIndex = (date: Date): number => (date.getDay() + 6) % 7;

const dayState = (
  key: string,
  { todayKey, signupKey, answered }: { todayKey: string; signupKey: string; answered: Map<string, DailyQuestionAnswerData> },
): CalendarDayState => {
  if (answered.has(key)) {
    return 'answered';
  }

  // String comparison is enough: `YYYY-MM-DD` sorts chronologically.
  if (key > todayKey || key < signupKey) {
    return 'inert';
  }

  return key === todayKey ? 'today' : 'missed';
};

export interface MonthGridInput {
  month: CalendarMonth;
  answers: DailyQuestionAnswerData[];
  /** Account creation day — everything before it is inert (docs/prd.md §5.2). */
  signupDate: Date;
  today: Date;
}

export const buildMonthGrid = ({ month, answers, signupDate, today }: MonthGridInput): MonthGrid => {
  const answered = new Map(answers.map((answer) => [ answer.date, answer ]));
  const todayKey = toDayKey(today);
  const signupKey = toDayKey(signupDate);

  const firstOfMonth = new Date(month.year, month.month, 1);
  const dayCount = new Date(month.year, month.month + 1, 0).getDate();

  const cells: (CalendarDay | null)[] = Array.from({ length: weekdayIndex(firstOfMonth) }, () => null);

  for (let dayOfMonth = 1; dayOfMonth <= dayCount; dayOfMonth += 1) {
    const key = toDayKey(new Date(month.year, month.month, dayOfMonth));

    cells.push({
      date: key,
      dayOfMonth,
      state: dayState(key, { todayKey, signupKey, answered }),
      answer: answered.get(key) ?? null,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (CalendarDay | null)[][] = [];

  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return { month, weeks };
};
