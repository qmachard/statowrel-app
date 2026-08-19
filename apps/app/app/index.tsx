import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MonthCalendar } from '@/components/MonthCalendar';
import { StatsHeader } from '@/components/StatsHeader';
import { StatTile } from '@/components/StatTile';
import { StreakCard } from '@/components/StreakCard';
import { CalendarShape, StarShape } from '@/components/icons/shapes';
import { brokenStreakScenario, runningStreakScenario, type StatsScenario } from '@/data/fakeStats';
import colors from '@/theme/colors';

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
  const [scenario, setScenario] = useState<StatsScenario>(runningStreakScenario);

  const answeredDays = useMemo(
    () => new Set(scenario.answers.map((answer) => answer.date)),
    [scenario],
  );
  const lateDays = useMemo(
    () => new Set(scenario.answers.filter((answer) => answer.late).map((answer) => answer.date)),
    [scenario],
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
        <StatsHeader displayName={scenario.user.display_name} />

        <StreakCard count={scenario.user.streak_count} />

        <View className="flex-row gap-4">
          <StatTile
            shape={StarShape}
            fill={colors.pop}
            label="Record"
            value={`${scenario.user.streak_best} j`}
          />
          <StatTile
            shape={CalendarShape}
            fill={colors.primary}
            label="Jours répondus"
            value={`${scenario.answeredCount}`}
          />
        </View>

        <MonthCalendar
          answeredDays={answeredDays}
          lateDays={lateDays}
          statLabels={scenario.statLabels}
          signUpDate={scenario.signUpDate}
        />

        {__DEV__ ? (
          <ScenarioSwitch scenario={scenario} onChange={setScenario} />
        ) : null}
      </ScrollView>
    </View>
  );
}

/**
 * Dev-only switch between the placeholder datasets, so the broken-streak state
 * can be reviewed without editing code. Goes away with `@/data/fakeStats`.
 */
function ScenarioSwitch({
  scenario,
  onChange,
}: {
  scenario: StatsScenario;
  onChange: (next: StatsScenario) => void;
}) {
  const options: { label: string; value: StatsScenario }[] = [
    { label: 'Streak en cours', value: runningStreakScenario },
    { label: 'Streak perdu', value: brokenStreakScenario },
  ];

  return (
    <View className="border-2 border-dashed border-muted-foreground p-3">
      <Text className="font-sans text-xs uppercase text-muted-foreground">Aperçu (dev)</Text>
      <View className="mt-2 flex-row gap-2">
        {options.map((option) => (
          <Pressable
            key={option.label}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            className={`flex-1 border-2 border-border p-2 ${scenario === option.value ? 'bg-primary shadow-sm' : 'bg-card'}`}
          >
            <Text className="text-center font-sans text-xs text-foreground">{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
