import { useEffect, useState } from 'react';
import { Animated, Text, View, type ViewStyle } from 'react-native';

import { shadows } from '@/design/shadows';
import type { CalendarDayState } from '@/stats/helpers/calendarState';

import { Hatch } from './Hatch';

const SURFACE: Record<CalendarDayState, string> = {
  answered: 'border-2 border-border bg-primary',
  // Doubled border, per docs/prd.md §5.2 — today has to read before anything else.
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

/**
 * The pulse of the "today, unanswered" cell. `Animated` rather than Reanimated:
 * a two-step native-driven loop needs neither worklets nor a shared value, and a
 * transform is the one thing on this screen Tailwind can't express.
 */
const usePulse = (active: boolean) => {
  // `useState` rather than `useRef`: the value is read during render (the
  // interpolation below), which is exactly what a ref is not for.
  const [ progress ] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active) {
      return;
    }

    const loop = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));

    loop.start();

    return () => loop.stop();
  }, [ active, progress ]);

  return progress.interpolate({ inputRange: [ 0, 1 ], outputRange: [ 1, 1.08 ] });
};

export interface CalendarDayProps {
  date: Date;
  state: CalendarDayState;
}

// Presentational only. The taps of docs/prd.md §5.2 — open the day's card, or
// the question sheet in catch-up mode — land once those screens exist.
export const CalendarDay = ({ date, state }: CalendarDayProps) => {
  const scale = usePulse(state === 'today');

  return (
    <Animated.View style={{ flex: 1, transform: [ { scale } ] }}>
      <View
        style={SHADOW[state]}
        className={`h-full w-full items-center justify-center overflow-hidden rounded ${SURFACE[state]}`}
      >
        {state === 'missed' ? <Hatch /> : null}
        <Text className={`text-sm ${LABEL[state]}`}>{date.getDate()}</Text>
        {state === 'missed' ? <Text className="font-head text-[9px] text-muted-foreground">?</Text> : null}
      </View>
    </Animated.View>
  );
};
