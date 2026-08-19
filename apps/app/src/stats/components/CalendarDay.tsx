import { Text, View, type ViewStyle } from 'react-native';

import { shadows } from '@/design/shadows';
import type { CalendarDayState } from '@/stats/helpers/calendarState';

import { Hatch } from './Hatch';

const SURFACE: Record<CalendarDayState, string> = {
  answered: 'border-2 border-border bg-primary',
  // Doubled border on the accent red, per docs/prd.md §5.2 — today has to read
  // before anything else, and it does so without moving.
  today: 'border-4 border-border bg-accent',
  missed: 'border-2 border-border bg-background',
  idle: 'bg-muted',
};

// Only an answered day is raised. A style rather than a `shadow-sm` className:
// Nativewind's version blurs the edge — see `src/design/shadows.ts`.
const SHADOW: Record<CalendarDayState, ViewStyle | undefined> = {
  answered: shadows.sm,
  today: undefined,
  missed: undefined,
  idle: undefined,
};

const LABEL: Record<CalendarDayState, string> = {
  answered: 'font-head text-primary-foreground',
  today: 'font-head text-accent-foreground',
  missed: 'font-head text-muted-foreground',
  idle: 'font-sans text-muted-foreground',
};

export interface CalendarDayProps {
  date: Date;
  state: CalendarDayState;
}

// Presentational only. The taps of docs/prd.md §5.2 — open the day's card, or
// the question sheet in catch-up mode — land once those screens exist.
export const CalendarDay = ({ date, state }: CalendarDayProps) => (
  <View
    style={SHADOW[state]}
    className={`h-full w-full items-center justify-center overflow-hidden rounded ${SURFACE[state]}`}
  >
    {state === 'missed' ? <Hatch /> : null}
    <Text className={`text-sm ${LABEL[state]}`}>{date.getDate()}</Text>
    {state === 'missed' ? <Text className="font-head text-[9px] text-muted-foreground">?</Text> : null}
  </View>
);
