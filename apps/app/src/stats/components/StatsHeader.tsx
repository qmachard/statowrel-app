import { Menu, UserRoundPlus } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';
import { formatDayLabel } from '@/lib/dates';

export interface StatsHeaderProps {
  displayName: string;
  /** Invite a friend by handle — docs/prd.md §4.1, the `InviteFriend` sheet. */
  onInvite?: () => void;
  /** Open the menu — profile today, settings and friends later. */
  onOpenMenu?: () => void;
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(4),
  },
  greeting: {
    flexShrink: 1,
    gap: spacing(1.5),
  },
  day: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    color: colors['muted-foreground'],
  },
  name: {
    fontFamily: fonts.head,
    fontSize: fontSize.xl,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing(3),
  },
});

/** Greeting on the left, the app's only two actions on the right (docs/prd.md §5.1). */
export const StatsHeader = ({ displayName, onInvite, onOpenMenu }: StatsHeaderProps) => (
  <View style={styles.root}>
    <View style={styles.greeting}>
      <Text style={styles.day}>{formatDayLabel(new Date())}</Text>
      <Text style={styles.name} numberOfLines={1}>
        Salut {displayName}
      </Text>
    </View>

    <View style={styles.actions}>
      <Button label="Inviter un pote" icon={UserRoundPlus} size="icon" onPress={onInvite} />
      <Button label="Ouvrir le menu" icon={Menu} variant="outline" size="icon" onPress={onOpenMenu} />
    </View>
  </View>
);
