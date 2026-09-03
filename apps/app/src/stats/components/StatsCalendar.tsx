import { useNavigation } from '@react-navigation/native';
import { monthDayKeyOf } from '@statowrel/models';
import { useMemo } from 'react';

import { Calendar } from '@/components/Calendar';
import { Card, CardContent } from '@/components/Card';
import { fromDateKey, startOfMonth, toDateKey } from '@/lib/dates';
import { useToday } from '@/lib/useToday';
import { CalendarDay } from '@/stats/components/CalendarDay';
import type { CalendarMonth } from '@/stats/data/calendarCache';
import { useSeenFriendAnswers } from '@/stats/data/useSeenFriendAnswers';
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
 *
 * A day carries a **badge** when friends have answered it since it was last
 * looked at: the month's own `friendAnswers` counter against what this device
 * has already shown (`useSeenFriendAnswers`). Only on a day one has answered
 * oneself — a friend's answer is unlocked by one's own (docs/prd.md §4.5), so a
 * bead on any other day would point at something the tap could not show.
 */
export const StatsCalendar = ({ month, onMonthChange, calendar, archiveStart }: StatsCalendarProps) => {
  const navigation = useNavigation();
  const seenFriendAnswers = useSeenFriendAnswers();
  // Live: the calendar is mounted for as long as the app runs, and the day it
  // paints in accent has to be the day it actually is (see `useToday`).
  const today = useToday();

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
            const joker = calendar.jokered[monthDayKey];
            const done = answer !== undefined || joker !== undefined;

            return (
              <CalendarDay
                date={date}
                answered={done}
                hasNewFriendAnswers={
                  done
                  && seenFriendAnswers !== null
                  && (calendar.friendAnswers[monthDayKey] ?? 0) > (seenFriendAnswers[dayKey] ?? 0)
                }
                state={getCalendarDayState({
                  day: dayKey,
                  today: todayKey,
                  published: calendar.published[monthDayKey] !== undefined,
                  answered: answer !== undefined,
                  jokered: joker !== undefined,
                })}
                // Every live day opens its own day: the question when it is
                // still open — today's, or a missed one in catch-up — and the
                // StatOwrel card of §5.5 when it is answered, or the joker
                // result of §4.8 when it is passed. A day that never had a
                // question is `idle`, so it stays inert here.
                onPress={() => navigation.navigate('DailyQuestion', { date: dayKey })}
              />
            );
          }}
        />
      </CardContent>
    </Card>
  );
};
