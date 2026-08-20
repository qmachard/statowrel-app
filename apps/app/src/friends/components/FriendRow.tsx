import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

export interface FriendRowProps {
  /** The friend's handle, rendered with its `@` — docs/prd.md §4.1. */
  username: string;
  /** Their picture, read from their profile. Undefined while it loads, null when they have none — both fall back to the generated avatar. */
  photoUrl?: string | null;
  /** What this line is waiting on, when it is waiting on something. */
  note?: string;
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    borderRadius: radius.DEFAULT,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  body: {
    flexShrink: 1,
    gap: spacing(0.5),
  },
  username: {
    fontFamily: fonts.head,
    fontSize: fontSize.base,
    color: colors['card-foreground'],
  },
  note: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors['muted-foreground'],
  },
});

/** One line of the friend list: avatar, handle, and what it is waiting on if it is. */
export const FriendRow = ({ username, photoUrl, note }: FriendRowProps) => (
  <View style={[ styles.root, shadows.sm ]}>
    <Avatar size="lg" name={username} uri={photoUrl} />

    <View style={styles.body}>
      <Text style={styles.username} numberOfLines={1}>
        @{username}
      </Text>
      {note === undefined ? null : <Text style={styles.note}>{note}</Text>}
    </View>
  </View>
);
