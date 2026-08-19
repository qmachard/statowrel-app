import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { DayCell, type DayState } from '@/components/DayCell';
import { StickerButton } from '@/components/StickerButton';
import { ArrowLeftShape, ArrowRightShape } from '@/components/icons/shapes';
import {
  addMonths,
  buildMonthGrid,
  compareMonths,
  formatMonthLabel,
  type MonthCursor,
  toDayKey,
  toMonthCursor,
  WEEKDAY_LABELS,
} from '@/lib/calendar';
import colors from '@/theme/colors';

interface MonthCalendarProps {
  /** `YYYY-MM-DD` keys of the days the user answered. */
  answeredDays: Set<string>;
  /** Subset of `answeredDays` answered after the day closed. */
  lateDays: Set<string>;
  /** `stat_label` per answered day, shown as micro-text in the cell. */
  statLabels: Record<string, string>;
  /** Nothing before this date is answerable — the account's sign-up day. */
  signUpDate: Date;
  onDayPress?: (dayKey: string, state: DayState) => void;
}

/**
 * The month grid of the Stats screen (docs/prd.md §5.2) — the app's only
 * history. Navigation is bounded by the sign-up month on one side and the
 * current month on the other.
 */
export function MonthCalendar({
  answeredDays,
  lateDays,
  statLabels,
  signUpDate,
  onDayPress,
}: MonthCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDayKey(today), [today]);
  const currentMonth = useMemo(() => toMonthCursor(today), [today]);
  const firstMonth = useMemo(() => toMonthCursor(signUpDate), [signUpDate]);

  const [cursor, setCursor] = useState<MonthCursor>(currentMonth);

  const weeks = useMemo(() => buildMonthGrid(cursor), [cursor]);

  const canGoBack = compareMonths(cursor, firstMonth) > 0;
  const canGoForward = compareMonths(cursor, currentMonth) < 0;

  const stateOf = (date: Date): DayState => {
    const key = toDayKey(date);

    if (answeredDays.has(key)) {
      return 'answered';
    }

    if (key === todayKey) {
      return 'today';
    }

    // A day in the future, or one before the account existed, is inert: there
    // is nothing to catch up on.
    if (key > todayKey || toDayKey(signUpDate) > key) {
      return 'inert';
    }

    return 'missed';
  };

  return (
    <View className="w-full border-2 border-border bg-card p-4 shadow-lg">
      <View className="flex-row items-center justify-between">
        <StickerButton
          shape={ArrowLeftShape}
          label="Mois précédent"
          fill={colors.primary}
          size={40}
          disabled={!canGoBack}
          onPress={() => setCursor(addMonths(cursor, -1))}
        />
        <Text className="font-head text-lg text-card-foreground">{formatMonthLabel(cursor)}</Text>
        <StickerButton
          shape={ArrowRightShape}
          label="Mois suivant"
          fill={colors.primary}
          size={40}
          disabled={!canGoForward}
          onPress={() => setCursor(addMonths(cursor, 1))}
        />
      </View>

      <View className="mt-4 flex-row">
        {WEEKDAY_LABELS.map((label, index) => (
          <View key={`${label}-${index}`} className="flex-1 items-center">
            <Text className="font-sans text-xs uppercase text-muted-foreground">{label}</Text>
          </View>
        ))}
      </View>

      <View className="mt-2 gap-1.5">
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} className="flex-row gap-1.5">
            {week.map((date, dayIndex) => {
              if (date === null) {
                return <DayCell key={`blank-${dayIndex}`} day={null} state="inert" />;
              }

              const key = toDayKey(date);
              const state = stateOf(date);

              return (
                <DayCell
                  key={key}
                  day={date.getDate()}
                  state={state}
                  statLabel={statLabels[key]}
                  late={lateDays.has(key)}
                  onPress={onDayPress ? () => onDayPress(key, state) : undefined}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
