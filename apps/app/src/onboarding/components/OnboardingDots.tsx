import { StyleSheet, View } from 'react-native';

import { borderWidth, colors, radius, spacing } from '@/design/tokens';

const DOT_SIZE = spacing(2.5);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
  },
  dot: {
    height: DOT_SIZE,
    width: DOT_SIZE,
    borderRadius: radius.full,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  // The current slide is a bar rather than a bigger dot: it reads as « you are
  // here » instead of as a fourth, closer dot.
  current: {
    width: spacing(7),
    backgroundColor: colors.primary,
  },
});

export interface OnboardingDotsProps {
  count: number;
  current: number;
}

/** Where one is in the carousel — bordered like everything else, never a shadow. */
export const OnboardingDots = ({ count, current }: OnboardingDotsProps) => (
  <View
    accessibilityRole="progressbar"
    accessibilityValue={{ min: 1, max: count, now: current + 1 }}
    style={styles.row}
  >
    {Array.from({ length: count }, (_, index) => (
      <View key={index} style={[ styles.dot, index === current ? styles.current : null ]} />
    ))}
  </View>
);
