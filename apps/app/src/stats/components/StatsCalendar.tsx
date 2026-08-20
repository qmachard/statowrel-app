import { useNavigation } from '@react-navigation/native';
import { monthDayKeyOf } from '@statowrel/models';
import { useMemo } from 'react';

import { Calendar } from '@/components/Calendar';
import { Card, CardContent } from '@/components/Card';
import { fromDateKey, startOfDay, startOfMonth, toDateKey } from '@/lib/dates';
import { CalendarDay } from '@/stats/components/CalendarDay';
import type { CalendarMonth } from '@/stats/data/useStatsData';
import { getCalendarDayState } from '@/stats/helpers/calendarState';

export interface StatsCalendarProps {
  /** Any date inside the displayed month — owned by the screen, since the data follows it. */
  month: Date;
  onMonthChange: (month: Date) => void;
  /** The displayed month's two halves. Empty while it loads, which renders as an inert month. */
  calendar: CalendarMonth;
  /**
   * `YYYY-MM` of the first month a question was broadcast in — the calendar's
   * lower bound. Deliberately not the registration month: the archive belongs to
   * the questions, and a day older than the account is answerable in late mode
   * (docs/prd.md §4.2). `null` while it loads, which holds the calendar on the
   * current month rather than opening onto an unbounded past.
   */
  archiveStart: string | null;
}

/**
 * The month calendar of docs/prd.md §5.2 — the app's whole history, and the way
 * back to a past question or card.
 */
export const StatsCalendar = ({ month, onMonthChange, calendar, archiveStart }: StatsCalendarProps) => {
  const navigation = useNavigation();
  const today = useMemo(() => startOfDay(new Date()), []);

  const todayKey = toDateKey(today);
  const minMonth = useMemo(
    () => (archiveStart === null ? startOfMonth(today) : fromDateKey(`${archiveStart}-01`)),
    [ archiveStart, today ],
  );

  return (
    <Card>
      <CardContent>
        <Calendar
          month={month}
          onMonthChange={onMonthChange}
          minMonth={minMonth}
          maxMonth={startOfMonth(today)}
          renderDay={(date) => {
            const dayKey = toDateKey(date);
            const monthDayKey = monthDayKeyOf(dayKey);
            const answer = calendar.answered[monthDayKey];

            return (
              <CalendarDay
                date={date}
                statLabel={answer?.stat_label ?? null}
                state={getCalendarDayState({
                  day: dayKey,
                  today: todayKey,
                  published: calendar.published[monthDayKey] !== undefined,
                  answered: answer !== undefined,
                })}
                // Every live day opens its own day: the question when it is
                // still open — today's, or a missed one in catch-up — and the
                // StatOwrel card of §5.5 when it is answered, the sheet itself
                // forking on that. A day that never had a question is `idle`,
                // so it stays inert here.
                onPress={() => navigation.navigate('DailyQuestion', { date: dayKey })}
              />
            );
          }}
        />
      </CardContent>
    </Card>
  );
};
