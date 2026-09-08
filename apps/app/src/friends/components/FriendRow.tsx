import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';

export interface FriendRowProps {
  /** The friend's handle, rendered with its `@` — docs/prd.md §4.1. It also seeds the generated avatar, the only face a friend has today. */
  username: string;
  /** What this line is waiting on, when it is waiting on something. */
  note?: string;
  /** The line's own answer to its note — one or more buttons, rendered under it in the same column. */
  action?: ReactNode;
  /**
   * Opens what the row is about — the friend's own screen (docs/prd.md §5.3).
   *
   * Optional, and absent on a pending invitation: there is nothing to see about
   * somebody who is not a friend yet, and a row already carrying « Accepter » /
   * « Refuser » would be a third target on top of the two it asks for.
   */
  onPress?: () => void;
  /** The row's actions, pushed to the right — the row's menu. */
  children?: ReactNode;
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(3),
  },
  // A row carrying an action is taller than its avatar, and an avatar floating
  // in the middle of it reads as a second column: it belongs to the handle.
  stacked: {
    alignItems: 'flex-start',
  },
  body: {
    flex: 1,
    gap: spacing(0.5),
  },
  username: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    color: colors['card-foreground'],
  },
  note: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors['muted-foreground'],
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing(2),
    marginTop: spacing(2),
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  // The row has no surface of its own — the card around the list is the
  // surface — so the press state tints the row rather than lifting it.
  pressed: {
    backgroundColor: colors.muted,
  },
});

/**
 * One line of the friend list: avatar, handle, what it is waiting on if it is,
 * what to do about it under that, and its menu on the right.
 *
 * The action sits under the note rather than beside the handle: it answers the
 * note (« T'a envoyé une invitation. » → « Accepter » / « Refuser »), and
 * reading the two in that order is what makes the row make sense.
 *
 * It carries no surface of its own — the card around the list is the surface,
 * and the rows are cut out of it by separators.
 */
export const FriendRow = ({ username, note, action, onPress, children }: FriendRowProps) => (
  // `Pressable` even when nothing is pressable, rather than two branches
  // rendering the same tree: it lays out identically to the `View` it replaced
  // and it is inert without an `onPress`.
  <Pressable
    disabled={onPress === undefined}
    onPress={onPress}
    style={({ pressed }) => [
      styles.root,
      action === undefined ? null : styles.stacked,
      pressed ? styles.pressed : null,
    ]}
  >
    <Avatar size="lg" name={username} />

    <View style={styles.body}>
      <Text style={styles.username} numberOfLines={1}>
        @{username}
      </Text>
      {note === undefined ? null : <Text style={styles.note}>{note}</Text>}
      {action === undefined ? null : <View style={styles.action}>{action}</View>}
    </View>

    {children === undefined || children === null ? null : <View style={styles.actions}>{children}</View>}
  </Pressable>
);
