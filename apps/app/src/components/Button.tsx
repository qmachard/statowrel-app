import { ActivityIndicator, Pressable, type PressableProps, Text, View } from 'react-native';

import { COLORS } from '@/theme/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'outline';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
}

const SURFACE: Record<ButtonVariant, string> = {
  primary: 'bg-yellow',
  secondary: 'bg-black',
  accent: 'bg-pink',
  outline: 'bg-cream',
};

const LABEL: Record<ButtonVariant, string> = {
  primary: 'text-black',
  secondary: 'text-cream',
  accent: 'text-black',
  outline: 'text-black',
};

const SPINNER: Record<ButtonVariant, string> = {
  primary: COLORS.black,
  secondary: COLORS.cream,
  accent: COLORS.black,
  outline: COLORS.black,
};

export const Button = ({ label, variant = 'primary', loading = false, disabled, ...props }: ButtonProps) => {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      disabled={isDisabled}
      {...props}
    >
      {({ pressed }) => (
        <View
          className={[
            'flex-row items-center justify-center rounded-full border-2 border-black px-5 py-4',
            SURFACE[variant],
            // Pressing collapses the hard offset shadow — the neobrutalism "push".
            pressed ? 'shadow-none' : 'shadow-md',
            isDisabled ? 'opacity-50' : '',
          ].join(' ')}
        >
          {loading
            ? <ActivityIndicator color={SPINNER[variant]} />
            : <Text className={`font-head text-base uppercase ${LABEL[variant]}`}>{label}</Text>}
        </View>
      )}
    </Pressable>
  );
};
