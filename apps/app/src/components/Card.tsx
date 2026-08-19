import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, Text, type TextStyle, View, type ViewStyle } from 'react-native';

import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

/**
 * Neobrutalism card — the React Native port of
 * https://neobrutalism.com/docs/components/card.
 *
 * The web version leans on `has-*` variants and a `--card-spacing` custom
 * property, neither of which exists here. The root owns the vertical rhythm
 * (vertical padding + `gap`) and the sections own the horizontal padding, so a
 * section can still run edge to edge — that is how `CardFooter` gets its top
 * border across the full width.
 *
 * The surface and the shadow are props rather than `style` overrides, so a
 * caller can't half-override a variant: `style` is for layout only.
 */
export type CardVariant = 'card' | 'primary' | 'muted' | 'accent';

export type CardShadow = 'none' | 'sm' | 'md' | 'lg' | 'xl';

const styles = StyleSheet.create({
  root: {
    gap: spacing(5),
    borderRadius: radius.md,
    borderWidth,
    borderColor: colors.border,
    paddingVertical: spacing(5),
  },
  header: {
    gap: spacing(1.5),
    paddingHorizontal: spacing(5),
  },
  title: {
    fontFamily: fonts.head,
    fontSize: fontSize.base,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  description: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors['muted-foreground'],
  },
  content: {
    paddingHorizontal: spacing(5),
  },
  footer: {
    // Cancels the root's bottom padding — the React Native stand-in for the web
    // version's `has-data-[slot=card-footer]:pb-0`.
    marginBottom: -spacing(5),
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    borderTopWidth: borderWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.muted,
    padding: spacing(5),
  },
});

const SURFACE = StyleSheet.create({
  card: { backgroundColor: colors.card },
  primary: { backgroundColor: colors.primary },
  muted: { backgroundColor: colors.muted },
  accent: { backgroundColor: colors.accent },
}) satisfies Record<CardVariant, ViewStyle>;

const SHADOW: Record<CardShadow, ViewStyle | undefined> = {
  none: undefined,
  sm: shadows.sm,
  md: shadows.md,
  lg: shadows.lg,
  xl: shadows.xl,
};

export interface CardProps {
  variant?: CardVariant;
  shadow?: CardShadow;
  /** Layout only — the surface and the shadow go through `variant` / `shadow`. */
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export const Card = ({ variant = 'card', shadow = 'md', style, children }: CardProps) => (
  <View style={[ styles.root, SURFACE[variant], SHADOW[shadow], style ]}>{children}</View>
);

export interface CardSectionProps {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export interface CardTextProps {
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
}

export const CardHeader = ({ style, children }: CardSectionProps) => (
  <View style={[ styles.header, style ]}>{children}</View>
);

export const CardTitle = ({ style, children }: CardTextProps) => (
  <Text style={[ styles.title, style ]}>{children}</Text>
);

export const CardDescription = ({ style, children }: CardTextProps) => (
  <Text style={[ styles.description, style ]}>{children}</Text>
);

export const CardContent = ({ style, children }: CardSectionProps) => (
  <View style={[ styles.content, style ]}>{children}</View>
);

export const CardFooter = ({ style, children }: CardSectionProps) => (
  <View style={[ styles.footer, style ]}>{children}</View>
);
