import type { LucideIcon } from 'lucide-react-native';
import { Pressable, type PressableProps, View } from 'react-native';

import { COLORS } from '@/theme/colors';

export type IconButtonTone = 'cream' | 'yellow' | 'pink';

export interface IconButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  icon: LucideIcon;
  /** Required: the icon carries no text, so the label is the only thing a screen reader can read. */
  accessibilityLabel: string;
  tone?: IconButtonTone;
}

const SURFACE: Record<IconButtonTone, string> = {
  cream: 'bg-cream',
  yellow: 'bg-yellow',
  pink: 'bg-pink',
};

export const IconButton = ({ icon: Icon, tone = 'cream', disabled, ...props }: IconButtonProps) => (
  <Pressable accessibilityRole="button" disabled={disabled} {...props}>
    {({ pressed }) => (
      <View
        className={[
          'h-12 w-12 items-center justify-center rounded-full border-2 border-black',
          SURFACE[tone],
          pressed ? 'shadow-none' : 'shadow-sm',
          disabled ? 'opacity-50' : '',
        ].join(' ')}
      >
        <Icon color={COLORS.black} size={22} strokeWidth={2.5} />
      </View>
    )}
  </Pressable>
);
