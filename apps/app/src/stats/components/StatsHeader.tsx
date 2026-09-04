import { Coins, Menu, UserRoundPlus } from '@/components/icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, fontSize, fonts, radius, spacing } from '@/design/tokens';
import { amountLabel, spokenAmountLabel } from '@/lib/statflouzz';

export interface StatsHeaderProps {
  /** Wallet as the profile carries it — `statcoin_balance`, 0 while it loads. */
  statflouzz: number;
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
    gap: spacing(3),
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderRadius: radius.sm,
    backgroundColor: colors.muted,
  },
  walletCount: {
    fontFamily: fonts.head,
    fontSize: fontSize.lg,
    color: colors.foreground,
  },
});

/**
 * The invite button on the left, the wallet and the menu on the right
 * (docs/prd.md §5.1, §5.2 point 1) — the wallet is a flat `muted` chip (no
 * border, no shadow — the same recessed surface an idle calendar day carries),
 * so the header reads as one row of two actions with the balance sitting
 * between them rather than three raised buttons competing for the eye.
 */
export const StatsHeader = ({ statflouzz, onInvite, onOpenMenu }: StatsHeaderProps) => {
  return (
    <View style={styles.root}>
      <Button label="Inviter un pote" icon={UserRoundPlus} size="icon" onPress={onInvite} />

      <View style={styles.right}>
        <View style={styles.wallet} accessible accessibilityLabel={spokenAmountLabel(statflouzz)}>
          <Coins color={colors.foreground} size={18} />
          <Text style={styles.walletCount}>{amountLabel(statflouzz)}</Text>
        </View>

        <Button label="Ouvrir le menu" icon={Menu} variant="outline" size="icon" onPress={onOpenMenu} />
      </View>
    </View>
  );
};
