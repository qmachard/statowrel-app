import { Pressable, Text, View } from 'react-native';

import { shadows } from '@/design/shadows';

import type { StatsFixture, StatsFixtureId } from '@/stats/data/fixtures';

export interface DevFixtureSwitchProps {
  fixtures: StatsFixture[];
  active: StatsFixtureId;
  onSelect: (id: StatsFixtureId) => void;
}

/**
 * Flips the screen between the fake data sets. Render it behind `__DEV__` only —
 * it exists so both streak states can be reviewed without editing code, and it
 * disappears with the fixtures themselves.
 */
export const DevFixtureSwitch = ({ fixtures, active, onSelect }: DevFixtureSwitchProps) => (
  <View className="gap-3 rounded-md border-2 border-dashed border-muted-foreground bg-muted p-4">
    <Text className="font-sans text-[10px] uppercase text-muted-foreground">Dev — jeu de données</Text>
    <View className="flex-row gap-3">
      {fixtures.map((fixture) => {
        const selected = fixture.id === active;

        return (
          <Pressable
            key={fixture.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={selected ? shadows.sm : undefined}
            className={`flex-1 rounded-sm border-2 border-border px-3 py-2 ${selected ? 'bg-primary' : 'bg-card'}`}
            onPress={() => onSelect(fixture.id)}
          >
            <Text className="text-center font-sans text-xs uppercase text-foreground">{fixture.label}</Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);
