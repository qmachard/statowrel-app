import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { WEEKDAY_INITIALS, addMonths, compareMonths, formatMonthLabel, getMonthWeeks } from '@/lib/dates';

/**
 * Neobrutalism month calendar — the React Native port of
 * https://neobrutalism.com/docs/components/calendar.
 *
 * The web version wraps `react-day-picker`, which is DOM-only; the grid is laid
 * out by hand here. What it keeps is the shape: chevrons framing the month
 * label, a weekday row, then square cells. It is deliberately unopinionated
 * about the cells themselves — the day states belong to whoever renders them
 * (`renderDay`), not to the calendar.
 */
export interface CalendarProps {
  /** Any date inside the displayed month. */
  month: Date;
  onMonthChange: (month: Date) => void;
  /** Navigation bounds, inclusive. `null` leaves that direction open. */
  minMonth?: Date | null;
  maxMonth?: Date | null;
  renderDay: (date: Date) => ReactNode;
}

export const Calendar = ({ month, onMonthChange, minMonth = null, maxMonth = null, renderDay }: CalendarProps) => {
  const previousMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);
  const canGoBack = minMonth === null || compareMonths(previousMonth, minMonth) >= 0;
  const canGoForward = maxMonth === null || compareMonths(nextMonth, maxMonth) <= 0;

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Button
          label="Mois précédent"
          icon={ChevronLeft}
          variant="outline"
          size="icon-sm"
          disabled={!canGoBack}
          onPress={() => onMonthChange(previousMonth)}
        />
        <Text className="font-head text-base uppercase text-foreground">{formatMonthLabel(month)}</Text>
        <Button
          label="Mois suivant"
          icon={ChevronRight}
          variant="outline"
          size="icon-sm"
          disabled={!canGoForward}
          onPress={() => onMonthChange(nextMonth)}
        />
      </View>

      <View className="flex-row gap-1.5">
        {WEEKDAY_INITIALS.map((initial, index) => (
          <Text
            key={index}
            className="flex-1 text-center font-sans text-xs uppercase text-muted-foreground"
          >
            {initial}
          </Text>
        ))}
      </View>

      <View className="gap-1.5">
        {getMonthWeeks(month).map((week, weekIndex) => (
          <View key={weekIndex} className="flex-row gap-1.5">
            {week.map((date, dayIndex) => (
              <View key={dayIndex} className="aspect-square flex-1">
                {date === null ? null : renderDay(date)}
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};
