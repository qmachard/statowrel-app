import { useNavigation } from '@react-navigation/native';
import type { DailyQuestionAnswerData } from '@statowrel/models';
import { useMemo, useState } from 'react';

import { Calendar } from '@/components/Calendar';
import { Card, CardContent } from '@/components/Card';
import { startOfDay, startOfMonth, toDateKey } from '@/lib/dates';
import { CalendarDay } from '@/stats/components/CalendarDay';
import { getCalendarDayState } from '@/stats/helpers/calendarState';

export interface StatsCalendarProps {
  answers: DailyQuestionAnswerData[];
  /** `UserData.created_at` — the calendar's lower bound, nothing before it ever existed. */
  registeredAt: string;
}

/**
 * The month calendar of docs/prd.md §5.2 — the app's whole history, and later
 * the only way back to a past question or card.
 */
export const StatsCalendar = ({ answers, registeredAt }: StatsCalendarProps) => {
  const navigation = useNavigation();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [ month, setMonth ] = useState(() => startOfMonth(today));

  const todayKey = toDateKey(today);
  const registeredOn = useMemo(() => toDateKey(new Date(registeredAt)), [ registeredAt ]);
  const answeredDays = useMemo(() => new Set(answers.map((answer) => answer.date)), [ answers ]);

  return (
    <Card>
      <CardContent>
        <Calendar
          month={month}
          onMonthChange={setMonth}
          minMonth={startOfMonth(new Date(registeredAt))}
          maxMonth={startOfMonth(today)}
          renderDay={(date) => (
            <CalendarDay
              date={date}
              state={getCalendarDayState({ day: toDateKey(date), today: todayKey, registeredOn, answeredDays })}
              // Every live day opens its own question — today's, a missed one in
              // catch-up, or an answered one read-only. The card of §5.5 takes
              // over for the answered case once it exists.
              onPress={() => navigation.navigate('DailyQuestion', { date: toDateKey(date) })}
            />
          )}
        />
      </CardContent>
    </Card>
  );
};
