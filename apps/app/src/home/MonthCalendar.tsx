import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import type { DailyQuestionAnswerData } from '@statowrel/models';

import { HatchFill } from '@/components/HatchFill';
import { IconButton } from '@/components/IconButton';
import { Panel } from '@/components/Panel';

import {
  type CalendarDay,
  WEEKDAY_INITIALS,
  addMonths,
  buildMonthGrid,
  compareMonths,
  formatMonthLabel,
  toCalendarMonth,
} from './calendar';

export interface MonthCalendarProps {
  answers: DailyQuestionAnswerData[];
  signupDate: Date;
  today: Date;
}

const CELL_SURFACE: Record<CalendarDay['state'], string> = {
  // Answered days are the ordinary win: gold.
  answered: 'border-2 border-black bg-yellow shadow-xs',
  // A missed day keeps the frame but loses the ink — hatched, not filled.
  // `overflow-hidden` is what clips the hatching to the rounded corners.
  missed: 'overflow-hidden border-2 border-black bg-cream',
  // Today is the one day that can still change: pink, on a doubled border.
  today: 'border-4 border-black bg-pink shadow-sm',
  // Future days, and anything before the account existed: no frame at all.
  inert: 'opacity-40',
};

const STATE_LABELS: Record<CalendarDay['state'], string> = {
  answered: 'répondu',
  missed: 'raté',
  today: 'aujourd’hui, pas encore répondu',
  inert: 'hors période',
};

const DayCell = ({ day }: { day: CalendarDay }) => (
  <View
    accessibilityLabel={`${day.dayOfMonth} — ${STATE_LABELS[day.state]}`}
    className={`aspect-square flex-1 items-center justify-center rounded-panel ${CELL_SURFACE[day.state]}`}
  >
    {day.state === 'missed' ? <HatchFill /> : null}

    <Text className={`font-head text-xs ${day.state === 'inert' ? 'text-black/50' : 'text-black'}`}>
      {day.state === 'missed' ? '?' : day.dayOfMonth}
    </Text>
  </View>
);

/**
 * The month grid of docs/prd.md §5.2 — and, once the question sheet exists, the
 * app's whole history: the only place a past day can be reopened.
 *
 * Navigation is bounded on both sides: there is nothing to show before the
 * account was created, and the future holds no question yet.
 */
export const MonthCalendar = ({ answers, signupDate, today }: MonthCalendarProps) => {
  const [ month, setMonth ] = useState(() => toCalendarMonth(today));

  const firstMonth = useMemo(() => toCalendarMonth(signupDate), [ signupDate ]);
  const lastMonth = useMemo(() => toCalendarMonth(today), [ today ]);

  const grid = useMemo(
    () => buildMonthGrid({ month, answers, signupDate, today }),
    [ month, answers, signupDate, today ],
  );

  const canGoBack = compareMonths(month, firstMonth) > 0;
  const canGoForward = compareMonths(month, lastMonth) < 0;

  return (
    <Panel className="gap-4 p-4">
      <View className="flex-row items-center justify-between gap-3">
        <IconButton
          icon={ChevronLeft}
          accessibilityLabel="Mois précédent"
          disabled={!canGoBack}
          onPress={() => setMonth(addMonths(month, -1))}
        />

        <Text className="shrink font-head text-base uppercase text-black" numberOfLines={1}>
          {formatMonthLabel(month)}
        </Text>

        <IconButton
          icon={ChevronRight}
          accessibilityLabel="Mois suivant"
          disabled={!canGoForward}
          onPress={() => setMonth(addMonths(month, 1))}
        />
      </View>

      <View className="flex-row gap-1.5">
        {WEEKDAY_INITIALS.map((initial, index) => (
          <Text key={index} className="flex-1 text-center font-sans text-xs uppercase text-black/60">
            {initial}
          </Text>
        ))}
      </View>

      <View className="gap-1.5">
        {grid.weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} className="flex-row gap-1.5">
            {week.map((day, index) => (
              day ? <DayCell key={day.date} day={day} /> : <View key={`pad-${index}`} className="flex-1 aspect-square" />
            ))}
          </View>
        ))}
      </View>
    </Panel>
  );
};
