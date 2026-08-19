import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, type PressableProps, Text, View } from 'react-native';

import { ink } from '@/design/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'accent';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  /** Icône Lucide (`lucide-react-native`), posée avant le label. Jamais d'emoji. */
  icon?: LucideIcon;
}

const SURFACE: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  outline: 'bg-card',
  accent: 'bg-accent',
};

const LABEL: Record<ButtonVariant, string> = {
  primary: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
  outline: 'text-foreground',
  accent: 'text-accent-foreground',
};

// Une icône prend sa couleur en prop, pas en className — d'où le passage par
// les encres du runtime plutôt que par un `text-*`.
const CONTENT: Record<ButtonVariant, string> = {
  primary: ink.black,
  secondary: ink.cream,
  outline: ink.black,
  accent: ink.black,
};

export const Button = ({
  label,
  variant = 'primary',
  loading = false,
  icon: Icon,
  disabled,
  ...props
}: ButtonProps) => {
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
            // Les boutons sont les seules formes en radius full — les panels
            // restent en `rounded-panel`.
            'flex-row items-center justify-center gap-2 rounded-full border-2 border-border px-5 py-4',
            SURFACE[variant],
            // Pressing collapses the hard offset shadow — the neobrutalism "push".
            pressed ? 'shadow-none' : 'shadow-md',
            isDisabled ? 'opacity-50' : '',
          ].join(' ')}
        >
          {loading ? (
            <ActivityIndicator color={CONTENT[variant]} />
          ) : (
            <>
              {Icon ? <Icon size={18} strokeWidth={2.5} color={CONTENT[variant]} /> : null}
              <Text className={`font-head text-base uppercase ${LABEL[variant]}`}>{label}</Text>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
};
