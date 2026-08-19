import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

export interface DailyQuestionBannerProps {
  /** `QuestionData.label` — the question itself, the only thing worth reading here. */
  label: string;
  /** Opens the question sheet (docs/prd.md §5.4). Inert until that sheet exists. */
  onPress?: () => void;
}

const styles = StyleSheet.create({
  surface: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(4),
    borderRadius: radius.md,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.accent,
    padding: spacing(5),
  },
  copy: {
    flex: 1,
    gap: spacing(1.5),
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    color: colors['accent-foreground'],
  },
  label: {
    fontFamily: fonts.head,
    fontSize: fontSize.lg,
    color: colors['accent-foreground'],
  },
});

/** A pressed banner sinks by exactly its shadow offset — 4px, the offset of `shadows.md`. */
const SUNK: ViewStyle = { transform: [ { translateX: spacing(1) }, { translateY: spacing(1) } ] };

/**
 * The first thing on the screen when today's question is still unanswered
 * (docs/prd.md §5.2): an `accent` banner, the same token the calendar gives to
 * an unanswered today. It is the way in to the question sheet (§5.4) — until
 * that sheet exists, it announces the question and nothing more.
 */
export const DailyQuestionBanner = ({ label, onPress }: DailyQuestionBannerProps) => (
  <Pressable accessibilityRole="button" accessibilityLabel={`Question du jour : ${label}`} onPress={onPress}>
    {({ pressed }) => (
      <View style={[ styles.surface, pressed ? SUNK : shadows.md ]}>
        <View style={styles.copy}>
          <Text style={styles.caption}>Question du jour</Text>
          <Text style={styles.label} numberOfLines={3}>
            {label}
          </Text>
        </View>

        <ChevronRight size={28} color={colors['accent-foreground']} />
      </View>
    )}
  </Pressable>
);
