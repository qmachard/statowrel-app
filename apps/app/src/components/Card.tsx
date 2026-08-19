import type { ReactNode } from 'react';
import { Text, View, type ViewStyle } from 'react-native';

import { shadows } from '@/design/shadows';

/**
 * Neobrutalism card — the React Native port of
 * https://neobrutalism.com/docs/components/card.
 *
 * The web version leans on `has-*` variants and a `--card-spacing` custom
 * property, neither of which exists here. The root owns the vertical rhythm
 * (`py-4` + `gap-4`) and the sections own the horizontal padding, so a section
 * can still run edge to edge — that is how `CardFooter` gets its top border
 * across the full width.
 *
 * The surface and the shadow are props rather than `className` overrides: the
 * shadow has to be a style (`src/design/shadows.ts` explains why Nativewind's
 * `shadow-*` classNames are off limits), and a `bg-*` passed through
 * `className` would fight the variant's own, with Tailwind's stylesheet order
 * — not the order in the string — deciding the winner.
 */
export type CardVariant = 'card' | 'primary' | 'muted' | 'accent';

export type CardShadow = 'none' | 'sm' | 'md' | 'lg' | 'xl';

const SURFACE: Record<CardVariant, string> = {
  card: 'bg-card',
  primary: 'bg-primary',
  muted: 'bg-muted',
  accent: 'bg-accent',
};

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
  className?: string;
  children?: ReactNode;
}

export const Card = ({ variant = 'card', shadow = 'md', className = '', children }: CardProps) => (
  <View
    style={SHADOW[shadow]}
    className={`gap-5 rounded-md border-2 border-border py-5 ${SURFACE[variant]} ${className}`}
  >
    {children}
  </View>
);

export interface CardSectionProps {
  className?: string;
  children?: ReactNode;
}

export const CardHeader = ({ className = '', children }: CardSectionProps) => (
  <View className={`gap-1.5 px-5 ${className}`}>{children}</View>
);

export const CardTitle = ({ className = '', children }: CardSectionProps) => (
  <Text className={`font-head text-base uppercase text-foreground ${className}`}>{children}</Text>
);

export const CardDescription = ({ className = '', children }: CardSectionProps) => (
  <Text className={`font-sans text-sm text-muted-foreground ${className}`}>{children}</Text>
);

export const CardContent = ({ className = '', children }: CardSectionProps) => (
  <View className={`px-5 ${className}`}>{children}</View>
);

// `-mb-5` cancels the root's bottom padding, the React Native stand-in for the
// web version's `has-data-[slot=card-footer]:pb-0`.
export const CardFooter = ({ className = '', children }: CardSectionProps) => (
  <View className={`-mb-5 flex-row items-center rounded-b-md border-t-2 border-border bg-muted p-5 ${className}`}>
    {children}
  </View>
);
