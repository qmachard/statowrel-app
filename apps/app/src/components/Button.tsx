import type { ComponentType } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';

import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

export type ButtonVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';

export type ButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';

/**
 * Icons are passed as a component, not an element (`icon={Flame}`, not
 * `icon={<Flame />}`), so the button can hand them the color and the size its
 * variant and size demand — `lucide-react-native` icons take both as props.
 */
export type ButtonIcon = ComponentType<{ color?: string; size?: number }>;

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  /** Also the accessibility label of the icon-only sizes, which don't render it. */
  label: string;
  /**
   * A small line under the label — the condition, the price or the caveat the
   * label alone can't carry. Sans-serif, lower case, dimmed against the
   * variant's own foreground, and read as the button's accessibility hint.
   */
  description?: string;
  /**
   * A short string set at the end of the button, past the label — a price, a
   * count. Sans-serif and a step down, so it reads as a qualifier of the
   * action rather than as part of it, and coloured by the variant like
   * everything else here: a caller supplies the text, never the surface.
   */
  trailingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ButtonIcon;
  iconPosition?: 'start' | 'end';
  loading?: boolean;
}

const styles = StyleSheet.create({
  surface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
    borderRadius: radius.sm,
  },
  // A described button stops centring its copy: the two lines are a block, and
  // a block reads from its left edge. It takes the width the icon leaves, so
  // the label and its description start on the same pixel.
  copy: {
    flex: 1,
    gap: spacing(1),
  },
  label: {
    fontFamily: fonts.head,
    textTransform: 'uppercase',
  },
  description: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    // Dimmed rather than recoloured: every variant already hands it a
    // foreground that reads on its own surface.
    opacity: 0.75,
  },
  // Not dimmed the way `description` is: a price is information the button
  // carries, not a caveat under it. The hierarchy comes from the face and the
  // size alone.
  trailingLabel: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
  },
  disabled: {
    opacity: 0.6,
  },
});

const SURFACE = StyleSheet.create({
  default: { borderWidth, borderColor: colors.border, backgroundColor: colors.primary },
  secondary: { borderWidth, borderColor: colors.border, backgroundColor: colors.secondary },
  destructive: { borderWidth, borderColor: colors.border, backgroundColor: colors.destructive },
  outline: { borderWidth, borderColor: colors.border, backgroundColor: colors.card },
  ghost: { backgroundColor: 'transparent' },
  link: { backgroundColor: 'transparent' },
}) satisfies Record<ButtonVariant, ViewStyle>;

const LABEL = StyleSheet.create({
  default: { color: colors['primary-foreground'] },
  secondary: { color: colors['secondary-foreground'] },
  destructive: { color: colors['destructive-foreground'] },
  outline: { color: colors.foreground },
  ghost: { color: colors.foreground },
  link: { color: colors.foreground, textDecorationLine: 'underline' },
}) satisfies Record<ButtonVariant, TextStyle>;

/** The color icons and the spinner take, mirroring `LABEL`. */
const FOREGROUND: Record<ButtonVariant, string> = {
  default: colors['primary-foreground'],
  secondary: colors['secondary-foreground'],
  destructive: colors['destructive-foreground'],
  outline: colors.foreground,
  ghost: colors.foreground,
  link: colors.foreground,
};

/**
 * The raised variants carry the hard offset shadow at rest; `ghost` and `link`
 * are flat, so they have nothing to sink into.
 */
const RESTING: Record<ButtonVariant, ViewStyle | undefined> = {
  default: shadows.md,
  secondary: shadows.md,
  destructive: shadows.md,
  outline: shadows.md,
  ghost: undefined,
  link: undefined,
};

/** A raised variant sinks by exactly its shadow offset — 4px, the offset of `shadows.md`. */
const SUNK: ViewStyle = { transform: [ { translateX: spacing(1) }, { translateY: spacing(1) } ] };

const PRESSED: Record<ButtonVariant, ViewStyle | undefined> = {
  default: SUNK,
  secondary: SUNK,
  destructive: SUNK,
  outline: SUNK,
  ghost: undefined,
  link: undefined,
};

/**
 * The flat variants have no shadow to sink into: they acknowledge the press
 * with a tint. `muted` rather than `accent` — accent is a saturated red now,
 * far too loud for a ghost button, and its white foreground would have been
 * invisible on the page the rest of the time.
 */
const PRESSED_TINT = StyleSheet.create({
  default: {},
  secondary: {},
  destructive: {},
  outline: {},
  ghost: { backgroundColor: colors.muted },
  link: { opacity: 0.7 },
}) satisfies Record<ButtonVariant, ViewStyle>;

const SIZE = StyleSheet.create({
  default: { paddingHorizontal: spacing(4), paddingVertical: spacing(3) },
  xs: { paddingHorizontal: spacing(2), paddingVertical: spacing(1) },
  sm: { paddingHorizontal: spacing(3), paddingVertical: spacing(2) },
  lg: { paddingHorizontal: spacing(6), paddingVertical: spacing(4) },
  'icon': { padding: spacing(3) },
  'icon-xs': { padding: spacing(1.5) },
  'icon-sm': { padding: spacing(2) },
  'icon-lg': { padding: spacing(4) },
}) satisfies Record<ButtonSize, ViewStyle>;

const TEXT_SIZE = StyleSheet.create({
  default: { fontSize: fontSize.base },
  xs: { fontSize: fontSize.xs },
  sm: { fontSize: fontSize.sm },
  lg: { fontSize: fontSize.lg },
  'icon': { fontSize: fontSize.base },
  'icon-xs': { fontSize: fontSize.xs },
  'icon-sm': { fontSize: fontSize.sm },
  'icon-lg': { fontSize: fontSize.lg },
}) satisfies Record<ButtonSize, TextStyle>;

const ICON_SIZE: Record<ButtonSize, number> = {
  default: 18,
  xs: 12,
  sm: 16,
  lg: 22,
  'icon': 20,
  'icon-xs': 14,
  'icon-sm': 16,
  'icon-lg': 24,
};

const isIconOnly = (size: ButtonSize) => size.startsWith('icon');

/**
 * The neobrutalist button: thick border, rounded corners (`sm`) and a hard
 * offset shadow it presses *into* — the press translates the surface by exactly
 * the shadow offset (4px, see `SUNK`) and drops the shadow, so the button looks
 * like it sinks flat against the page.
 */
export const Button = ({
  label,
  description,
  trailingLabel,
  variant = 'default',
  size = 'default',
  icon: Icon,
  iconPosition = 'start',
  loading = false,
  disabled,
  ...props
}: ButtonProps) => {
  const isDisabled = disabled || loading;
  const iconOnly = isIconOnly(size);
  const foreground = FOREGROUND[variant];

  const renderIcon = () => (Icon ? <Icon color={foreground} size={ICON_SIZE[size]} /> : null);

  const renderTrailingLabel = () => (trailingLabel === undefined || iconOnly ? null : (
    <Text style={[ styles.trailingLabel, LABEL[variant] ]}>{trailingLabel}</Text>
  ));

  const renderCopy = () => {
    if (iconOnly) {
      return null;
    }

    const text = <Text style={[ styles.label, TEXT_SIZE[size], LABEL[variant] ]}>{label}</Text>;

    if (description === undefined) {
      return text;
    }

    return (
      <View style={styles.copy}>
        {text}
        <Text style={[ styles.description, LABEL[variant] ]}>{description}</Text>
      </View>
    );
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      disabled={isDisabled}
      {...props}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.surface,
            SURFACE[variant],
            SIZE[size],
            // A pressed surface drops its shadow entirely — it has sunk into it.
            pressed ? PRESSED[variant] : RESTING[variant],
            pressed ? PRESSED_TINT[variant] : null,
            isDisabled ? styles.disabled : null,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={foreground} size="small" />
          ) : (
            <>
              {iconPosition === 'start' ? renderIcon() : null}
              {renderCopy()}
              {renderTrailingLabel()}
              {iconPosition === 'end' ? renderIcon() : null}
            </>
          )}
        </View>
      )}
    </Pressable>
  );
};
