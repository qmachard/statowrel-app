import { useState } from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SvgUri } from 'react-native-svg';

import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';
import { generatedAvatarUri } from '@/lib/avatars';

/**
 * Neobrutalism avatar — the React Native port of
 * https://neobrutalism.com/docs/components/avatar.
 *
 * The web version is a Radix root with two slots, `AvatarImage` and
 * `AvatarFallback`, which Radix swaps on the image's load state. Here the
 * layers are stacked instead of swapped, so nothing is ever an empty circle:
 *
 * 1. the **initials**, always rendered, always local — what shows while
 *    anything above is still on its way, and what is left if the network is
 *    not there at all;
 * 2. the **generated avatar**, a DiceBear patchwork seeded on the name
 *    (`src/lib/avatars.ts`) — an account has a face before it has a picture;
 * 3. the **picture**, when the profile carries one.
 *
 * A picture that fails to load is dropped rather than retried, and reveals the
 * generated one under it.
 */
export type AvatarSize = 'sm' | 'default' | 'lg' | 'xl';

export interface AvatarProps {
  /** Who this is — the handle or the display name. Seeds the generated avatar, and its initials are the offline fallback. */
  name: string;
  /** Their own picture, when they have one. Null, empty or failing falls back to the generated avatar. */
  uri?: string | null;
  size?: AvatarSize;
  /** Layout only — the surface is the component's. */
  style?: ViewStyle;
}

const SIZE: Record<AvatarSize, number> = {
  sm: spacing(6),
  default: spacing(8),
  lg: spacing(10),
  // The one the Menu screen leads with — a face, not a bullet point.
  xl: spacing(24),
};

const LABEL_SIZE: Record<AvatarSize, number> = {
  sm: fontSize.xs,
  default: fontSize.sm,
  lg: fontSize.sm,
  xl: fontSize['3xl'],
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
  layer: {
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

  const photo = uri === null || uri === '' || uri === failed ? null : uri;
  const side = SIZE[size];

  return (
    <View
      style={[ styles.root, { width: side, height: side }, style ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
    >
      <Text style={[ styles.initials, { fontSize: LABEL_SIZE[size] } ]}>{initialsOf(name)}</Text>

      <View style={styles.layer}>
        <SvgUri uri={generatedAvatarUri(name)} width={side} height={side} />
      </View>

      {photo === null ? null : (
        <Image
          style={styles.layer}
          source={{ uri: photo }}
          resizeMode="cover"
          onError={() => setFailed(photo)}
        />
      )}
    </View>
  );
};
