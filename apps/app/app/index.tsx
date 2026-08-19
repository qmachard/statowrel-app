import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MonthCalendar } from '@/components/MonthCalendar';
import { StatTile } from '@/components/StatTile';
import { StreakCard } from '@/components/StreakCard';
import {
  fakeAnsweredCount,
  fakeAnswers,
  fakeSignUpDate,
  fakeStatLabels,
  fakeUser,
} from '@/data/fakeStats';

/**
 * Stats screen — the app's home (docs/prd.md §5.2): the streak, the record, and
 * the calendar that doubles as the whole history.
 *
 * Data is still the placeholder set from `@/data/fakeStats`; swapping it for
 * the Firestore reads (`v1_users` + a collection-group query on
 * `v1_daily_question_answers`) touches this file only.
 */
export default function StatsScreen() {
  const insets = useSafeAreaInsets();

  const answeredDays = useMemo(() => new Set(fakeAnswers.map((answer) => answer.date)), []);
  const lateDays = useMemo(
    () => new Set(fakeAnswers.filter((answer) => answer.late).map((answer) => answer.date)),
    [],
  );

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 16,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text className="font-head text-3xl text-foreground">Salut {fakeUser.display_name}</Text>
          <Text className="font-sans text-base text-muted-foreground">Voilà où tu en es.</Text>
        </View>

        <StreakCard count={fakeUser.streak_count} />

        <View className="flex-row gap-4">
          <StatTile icon="🏆" label="Record" value={`${fakeUser.streak_best} j`} />
          <StatTile icon="🗓️" label="Jours répondus" value={`${fakeAnsweredCount}`} />
        </View>

        <MonthCalendar
          answeredDays={answeredDays}
          lateDays={lateDays}
          statLabels={fakeStatLabels}
          signUpDate={fakeSignUpDate}
        />

        <View className="border-2 border-border bg-accent p-4 shadow-md">
          <Text className="font-head text-base text-accent-foreground">
            La question tombe entre 8h et 20h
          </Text>
          <Text className="mt-1 font-sans text-sm text-accent-foreground">
            Pas de compte à rebours : l&apos;heure est tirée au hasard.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
