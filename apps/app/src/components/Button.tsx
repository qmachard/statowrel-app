import { ActivityIndicator, Pressable, type PressableProps, Text, View } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
}

const SURFACE: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  outline: 'bg-card',
};

const LABEL: Record<ButtonVariant, string> = {
  primary: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
  outline: 'text-foreground',
};

const SPINNER: Record<ButtonVariant, string> = {
  primary: '#000000',
  secondary: '#ffffff',
  outline: '#000000',
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
            'flex-row items-center justify-center border-2 border-border px-5 py-4',
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
