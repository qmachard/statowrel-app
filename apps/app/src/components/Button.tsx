import type { ComponentType } from 'react';
import { ActivityIndicator, Pressable, type PressableProps, Text, View } from 'react-native';

import { colors } from '@/design/tokens';

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
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ButtonIcon;
  iconPosition?: 'start' | 'end';
  loading?: boolean;
}

const SURFACE: Record<ButtonVariant, string> = {
  default: 'border-2 border-border bg-primary',
  secondary: 'border-2 border-border bg-secondary',
  destructive: 'border-2 border-border bg-destructive',
  outline: 'border-2 border-border bg-card',
  ghost: 'bg-transparent',
  link: 'bg-transparent',
};

const LABEL: Record<ButtonVariant, string> = {
  default: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
  destructive: 'text-destructive-foreground',
  outline: 'text-foreground',
  ghost: 'text-accent-foreground',
  link: 'text-foreground underline',
};

/** The color icons and the spinner take, mirroring `LABEL`. */
const FOREGROUND: Record<ButtonVariant, string> = {
  default: colors['primary-foreground'],
  secondary: colors['secondary-foreground'],
  destructive: colors['destructive-foreground'],
  outline: colors.foreground,
  ghost: colors['accent-foreground'],
  link: colors.foreground,
};

/**
 * The raised variants carry the hard offset shadow at rest; `ghost` and `link`
 * are flat, so they have nothing to sink into.
 */
const RESTING: Record<ButtonVariant, string> = {
  default: 'shadow-md',
  secondary: 'shadow-md',
  destructive: 'shadow-md',
  outline: 'shadow-md',
  ghost: '',
  link: '',
};

/**
 * A raised variant sinks by exactly its shadow offset and drops the shadow; the
 * flat ones acknowledge the press with a tint instead.
 */
const PRESSED: Record<ButtonVariant, string> = {
  default: 'translate-x-1 translate-y-1 shadow-none',
  secondary: 'translate-x-1 translate-y-1 shadow-none',
  destructive: 'translate-x-1 translate-y-1 shadow-none',
  outline: 'translate-x-1 translate-y-1 shadow-none',
  ghost: 'bg-accent',
  link: 'opacity-70',
};

const SIZE: Record<ButtonSize, string> = {
  default: 'px-4 py-3',
  xs: 'px-2 py-1',
  sm: 'px-3 py-2',
  lg: 'px-6 py-4',
  'icon': 'p-3',
  'icon-xs': 'p-1.5',
  'icon-sm': 'p-2',
  'icon-lg': 'p-4',
};

const TEXT_SIZE: Record<ButtonSize, string> = {
  default: 'text-base',
  xs: 'text-xs',
  sm: 'text-sm',
  lg: 'text-lg',
  'icon': 'text-base',
  'icon-xs': 'text-xs',
  'icon-sm': 'text-sm',
  'icon-lg': 'text-lg',
};

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
 * The neobrutalist button: thick border, slightly rounded corners and a hard
 * offset shadow it presses *into* — the press translates the surface by exactly
 * the shadow offset (`shadow-md` is 4px, `translate-*-1` is 4px) and drops the
 * shadow, so the button looks like it sinks flat against the page.
 */
export const Button = ({
  label,
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      disabled={isDisabled}
      {...props}
    >
      {({ pressed }) => (
        <View
          className={[
            'flex-row items-center justify-center gap-2 rounded',
            SURFACE[variant],
            SIZE[size],
            pressed ? PRESSED[variant] : RESTING[variant],
            isDisabled ? 'opacity-60' : '',
          ].join(' ')}
        >
          {loading ? (
            <ActivityIndicator color={foreground} size="small" />
          ) : (
            <>
              {iconPosition === 'start' ? renderIcon() : null}
              {iconOnly ? null : (
                <Text className={`font-head uppercase ${TEXT_SIZE[size]} ${LABEL[variant]}`}>{label}</Text>
              )}
              {iconPosition === 'end' ? renderIcon() : null}
            </>
          )}
        </View>
      )}
    </Pressable>
  );
};
