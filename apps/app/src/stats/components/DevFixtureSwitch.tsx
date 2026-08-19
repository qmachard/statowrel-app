import { Pressable, StyleSheet, Text, View } from 'react-native';

import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

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
const styles = StyleSheet.create({
  root: {
    gap: spacing(3),
    borderRadius: radius.md,
    borderWidth,
    borderStyle: 'dashed',
    borderColor: colors['muted-foreground'],
    backgroundColor: colors.muted,
    padding: spacing(4),
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: fontSize['2xs'],
    textTransform: 'uppercase',
    color: colors['muted-foreground'],
  },
  row: {
    flexDirection: 'row',
    gap: spacing(3),
  },
  option: {
    flex: 1,
    borderRadius: radius.sm,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },
  optionSelected: {
    backgroundColor: colors.primary,
  },
  optionLabel: {
    textAlign: 'center',
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
});

export const DevFixtureSwitch = ({ fixtures, active, onSelect }: DevFixtureSwitchProps) => (
  <View style={styles.root}>
    <Text style={styles.caption}>Dev — jeu de données</Text>
    <View style={styles.row}>
      {fixtures.map((fixture) => {
        const selected = fixture.id === active;

        return (
          <Pressable
            key={fixture.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[ styles.option, selected ? styles.optionSelected : null, selected ? shadows.sm : null ]}
            onPress={() => onSelect(fixture.id)}
          >
            <Text style={styles.optionLabel}>{fixture.label}</Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);
