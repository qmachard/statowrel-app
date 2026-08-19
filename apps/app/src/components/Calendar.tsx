import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';
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

const styles = StyleSheet.create({
  root: {
    gap: spacing(4),
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthLabel: {
    fontFamily: fonts.head,
    fontSize: fontSize.base,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  row: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  weekdayInitial: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    color: colors['muted-foreground'],
  },
  weeks: {
    gap: spacing(2),
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
  },
});

export const Calendar = ({ month, onMonthChange, minMonth = null, maxMonth = null, renderDay }: CalendarProps) => {
  const previousMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);
  const canGoBack = minMonth === null || compareMonths(previousMonth, minMonth) >= 0;
  const canGoForward = maxMonth === null || compareMonths(nextMonth, maxMonth) <= 0;

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Button
          label="Mois précédent"
          icon={ChevronLeft}
          variant="outline"
          size="icon-sm"
          disabled={!canGoBack}
          onPress={() => onMonthChange(previousMonth)}
        />
        <Text style={styles.monthLabel}>{formatMonthLabel(month)}</Text>
        <Button
          label="Mois suivant"
          icon={ChevronRight}
          variant="outline"
          size="icon-sm"
          disabled={!canGoForward}
          onPress={() => onMonthChange(nextMonth)}
        />
      </View>

      <View style={styles.row}>
        {WEEKDAY_INITIALS.map((initial, index) => (
          <Text key={index} style={styles.weekdayInitial}>
            {initial}
          </Text>
        ))}
      </View>

      <View style={styles.weeks}>
        {getMonthWeeks(month).map((week, weekIndex) => (
          <View key={weekIndex} style={styles.row}>
            {week.map((date, dayIndex) => (
              <View key={dayIndex} style={styles.cell}>
                {date === null ? null : renderDay(date)}
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};
