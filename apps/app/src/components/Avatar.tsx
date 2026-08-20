import { useState } from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

/**
 * Neobrutalism avatar — the React Native port of
 * https://neobrutalism.com/docs/components/avatar.
 *
 * The web version is a Radix root with two slots, `AvatarImage` and
 * `AvatarFallback`, which Radix swaps on the image's load state. Here the
 * fallback is not a slot but the surface itself: the initials are always
 * rendered and the image is laid over them, so a picture that is slow, missing
 * or broken shows a name rather than a hole — and there is no second component
 * to remember to pass.
 */
export type AvatarSize = 'sm' | 'default' | 'lg';

export interface AvatarProps {
  /** Who this is — the handle or the display name. Only its initials are shown. */
  name: string;
  /** The picture, when there is one. Null, empty or failing falls back to the initials. */
  uri?: string | null;
  size?: AvatarSize;
  /** Layout only — the surface is the component's. */
  style?: ViewStyle;
}

const SIZE: Record<AvatarSize, number> = {
  sm: spacing(6),
  default: spacing(8),
  lg: spacing(10),
};

const LABEL_SIZE: Record<AvatarSize, number> = {
  sm: fontSize.xs,
  default: fontSize.sm,
  lg: fontSize.sm,
};

const styles = StyleSheet.create({
  root: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.full,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  initials: {
    fontFamily: fonts.head,
    textTransform: 'uppercase',
    color: colors['muted-foreground'],
  },
  image: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.full,
  },
});

/**
 * Two letters at most, taken from the words a name is made of — a handle's
 * separators count as word breaks, so `lou.martin` reads `LM` rather than `LO`.
 */
export const initialsOf = (name: string) => (
  name
    .split(/[\s._-]+/)
    .filter((word) => word.length > 0)
    .slice(0, 2)
    .map((word) => word[0])
    .join('') || '?'
);

export const Avatar = ({ name, uri = null, size = 'default', style }: AvatarProps) => {
  // The picture that failed, not a boolean: a row recycled onto another friend
  // then carries a URI that is no longer the broken one, so the new picture is
  // tried instead of staying hidden behind the previous one's failure.
  const [ failed, setFailed ] = useState<string | null>(null);

  const source = uri === null || uri === '' || uri === failed ? null : uri;

  return (
    <View
      style={[ styles.root, { width: SIZE[size], height: SIZE[size] }, style ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
    >
      <Text style={[ styles.initials, { fontSize: LABEL_SIZE[size] } ]}>{initialsOf(name)}</Text>

      {source === null ? null : (
        <Image
          style={styles.image}
          source={{ uri: source }}
          resizeMode="cover"
          onError={() => setFailed(source)}
        />
      )}
    </View>
  );
};
