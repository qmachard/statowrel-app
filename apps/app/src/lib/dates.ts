/**
 * Local-calendar date helpers, shared by the Stats calendar and its fixtures.
 *
 * Everything is computed on the device's local calendar and keyed by the
 * `YYYY-MM-DD` strings the data model already speaks — `DailyQuestionAnswerData.date`,
 * `UserFirebaseData.streak_last_answered_on`. No UTC round-trip anywhere: a `Date`
 * built from local parts and read back with `getFullYear()` and friends stays on
 * the same day, `toISOString()` would not. v1 is single-timezone (docs/prd.md §7).
 */

/** `YYYY-MM-DD` day key, the format every date field of the model uses. */
export type DateKey = string;

// French labels are hardcoded rather than taken from `Intl`: the app is
// French-only (docs/prd.md), and Hermes ships its ICU data per platform.
const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const WEEKDAYS = [ 'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi' ];

/** Monday first — the French week, and the order `getMonthWeeks` lays the grid out in. */
export const WEEKDAY_INITIALS = [ 'L', 'M', 'M', 'J', 'V', 'S', 'D' ];

const pad = (value: number) => String(value).padStart(2, '0');

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const toDateKey = (date: Date): DateKey => (
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
);

/**
 * The `Date` a `YYYY-MM-DD` key stands for, at local midnight — the inverse of
 * `toDateKey`. Built from parts, never `new Date(key)`: that parses the string
 * as UTC midnight, which is the day before anywhere west of Greenwich.
 */
export const fromDateKey = (key: DateKey): Date => {
  const [ year, month, day ] = key.split('-').map(Number);

  return new Date(year, month - 1, day);
};

/** Midnight on that day — the anchor every relative date on the screen is built from. */
export const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addDays = (date: Date, days: number) => (
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
);

export const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1);

/** Negative when `a` falls in an earlier month than `b`, `0` for the same month. */
export const compareMonths = (a: Date, b: Date) => (
  (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth())
);

/**
 * The month laid out as weeks of seven slots, Monday first. Slots outside the
 * month are `null`: the calendar shows one month at a time (docs/prd.md §5.2),
 * so neighbouring days would only be noise to tap on.
 */
export const getMonthWeeks = (month: Date): (Date | null)[][] => {
  const first = startOfMonth(month);
  // `getDay()` is Sunday-based; shift it so Monday lands on 0.
  const leading = (first.getDay() + 6) % 7;
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  const slots: (Date | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: dayCount }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1)),
  ];

  while (slots.length % 7 !== 0) {
    slots.push(null);
  }

  return Array.from({ length: slots.length / 7 }, (_, week) => slots.slice(week * 7, week * 7 + 7));
};

/** « Août 2026 ». */
export const formatMonthLabel = (month: Date) => capitalize(`${MONTHS[month.getMonth()]} ${month.getFullYear()}`);

/** « Mardi 19 août ». */
export const formatDayLabel = (date: Date) => (
  capitalize(`${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`)
);

/** « 14h32 » — the hour a friend answered (docs/prd.md §4.5), on the device's own clock. */
export const formatTimeLabel = (date: Date) => `${date.getHours()}h${pad(date.getMinutes())}`;
