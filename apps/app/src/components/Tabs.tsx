import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

export interface TabItem<T extends string> {
  value: T;
  label: string;
}

export interface TabsProps<T extends string> {
  items: readonly TabItem<T>[];
  /** The selected tab — controlled, the caller owns the state. */
  value: T;
  onChange: (value: T) => void;
  /** Layout only — the surface comes from the tokens, never from a caller. */
  style?: StyleProp<ViewStyle>;
}

const styles = StyleSheet.create({
  // One bordered surface cut into segments, rather than a row of buttons: the
  // segments have to read as two halves of the same control, and a gap between
  // them would make them two independent actions.
  root: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.sm,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(2),
  },
  // Every segment but the first carries the divider, so the control keeps a
  // single border all the way round whatever it is given.
  divided: {
    borderLeftWidth: borderWidth,
    borderLeftColor: colors.border,
  },
  selected: {
    backgroundColor: colors.primary,
  },
  // A segment can't sink into the shadow the way a button does — it is inside a
  // frame it would tear away from — so the press reads as a dimming instead.
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: fonts.head,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    color: colors['muted-foreground'],
  },
  selectedLabel: {
    color: colors['primary-foreground'],
  },
});

/**
 * Neobrutalist segmented control — what switches between two lists that would
 * otherwise be stacked into an endless scroll (docs/prd.md §5.3).
 *
 * A control and not a navigator: it swaps what a screen shows, so it owns no
 * route and holds no state — the caller keeps the selected value, which is what
 * lets it keep both panels mounted and only hide the inactive one.
 */
export const Tabs = <T extends string>({ items, value, onChange, style }: TabsProps<T>) => (
  <View style={[ styles.root, shadows.md, style ]} accessibilityRole="tablist">
    {items.map((item, index) => {
      const selected = item.value === value;

      return (
        <Pressable
          key={item.value}
          accessibilityRole="tab"
          accessibilityState={{ selected }}
          onPress={() => onChange(item.value)}
          style={({ pressed }) => [
            styles.tab,
            index === 0 ? null : styles.divided,
            selected ? styles.selected : null,
            pressed && !selected ? styles.pressed : null,
          ]}
        >
          <Text style={[ styles.label, selected ? styles.selectedLabel : null ]} numberOfLines={1}>
            {item.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);
