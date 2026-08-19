import { Pressable, View } from 'react-native';

import type { Shape } from '@/components/icons/shapes';
import colors from '@/theme/colors';

interface StickerButtonProps {
  shape: Shape;
  label: string;
  /** Background of the disc — a palette value, not a class, since it also tints the glyph's contrast. */
  fill: string;
  size?: number;
  disabled?: boolean;
  onPress?: () => void;
}

/**
 * Round filled disc, thick black border, hard offset shadow, black glyph — the
 * app's only icon button.
 */
export function StickerButton({
  shape,
  label,
  fill,
  size = 44,
  disabled = false,
  onPress,
}: StickerButtonProps) {
  const Glyph = shape;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      className={`items-center justify-center rounded-full border-2 border-border ${disabled ? 'opacity-40' : 'shadow-sm'}`}
      style={{ width: size, height: size, backgroundColor: disabled ? colors.muted : fill }}
    >
      <View style={{ pointerEvents: 'none' }}>
        <Glyph size={Math.round(size * 0.5)} fill={colors.border} />
      </View>
    </Pressable>
  );
}
