import { REFERRAL_STATFLOUZZ_REWARD } from '@statowrel/models';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Share2 } from '@/components/icons';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';
import { FriendRow } from '@/friends/components/FriendRow';
import { amountLabel, spokenAmountLabel } from '@/lib/statflouzz';
import { EMPTY, FAILURE, SHARE_LABEL, TITLE, WAITING, WAITING_NOTE } from '@/referrals/copy';
import { shareInvite } from '@/referrals/data/shareInvite';
import { useReferrals } from '@/referrals/data/useReferrals';

const styles = StyleSheet.create({
  root: {
    gap: spacing(3),
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(4),
  },
  title: {
    fontFamily: fonts.head,
    fontSize: fontSize.xl,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  // Same anatomy as the two lists above it on this screen: the card *is* the
  // list, and the separators run the full width.
  list: {
    gap: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  separated: {
    borderTopWidth: borderWidth,
    borderTopColor: colors.border,
  },
  state: {
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(5),
  },
  empty: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors['muted-foreground'],
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.destructive,
  },
  // The same pill « Mes questions » wears, and for the same reason: the state
  // is a badge, not a button, and must not offer a press the row does not take.
  badge: {
    borderWidth,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
  },
  waiting: {
    backgroundColor: colors.muted,
  },
  earned: {
    backgroundColor: colors.primary,
  },
  badgeLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize['2xs'],
    textTransform: 'uppercase',
    color: colors.foreground,
  },
});

/**
 * « Mes filleuls » on the Menu screen — docs/prd.md §4.9, and the answer to the
 * question the referral rail was built around: *how do I know that one came
 * from me?*
 *
 * The third list on this screen and deliberately the twin of the two above it:
 * one surface cut into rows by separators, the empty state in the list's own
 * place, the same failure line. A third list shaped differently would read as a
 * third app.
 *
 * **A row exists from the sign-up, not from the payout.** The reward waits for
 * the newcomer's first answer, which can be days out, and a card that stayed
 * empty until then would say the attribution had failed. So an unsettled row is
 * a line that says « en attente » — the state, not the absence.
 *
 * The share button sits beside the title, where the friend list carries its own
 * invitation button: sending the link and reading what it brought are the two
 * halves of the same screen.
 */
export const ReferralsCard = () => {
  const { profile } = useAuth();
  const { referrals, loading, failed } = useReferrals();
  const [ sharing, setSharing ] = useState(false);

  const username = profile?.username ?? '';

  const onShare = async () => {
    setSharing(true);

    try {
      await shareInvite(username);
    } catch (error: unknown) {
      // A share sheet that will not open costs the share and nothing else —
      // the handle is on screen, and it is the whole invitation.
      console.warn('[referrals] could not open the share sheet', error);
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text style={styles.title}>{TITLE}</Text>
        <Button
          label={SHARE_LABEL}
          icon={Share2}
          size="icon-sm"
          disabled={sharing || username === ''}
          onPress={onShare}
        />
      </View>

      <Card style={styles.list}>
        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.foreground} />
          </View>
        ) : null}

        {!loading && !failed && referrals.length === 0 ? (
          <View style={styles.state}>
            <Text style={styles.empty}>{EMPTY}</Text>
          </View>
        ) : null}

        {referrals.map((referral, index) => {
          const settled = Boolean(referral.rewarded_at);
          // What this one really paid, not what the next one will: a referral
          // settled past the cap shows nothing earned, which is the truth.
          const earned = amountLabel(settled ? referral.statcoins_earned : REFERRAL_STATFLOUZZ_REWARD);

          return (
            <View key={referral.referred_user_id} style={index === 0 ? null : styles.separated}>
              <FriendRow
                username={referral.referred_username}
                note={settled ? undefined : WAITING_NOTE}
              >
                <View style={[ styles.badge, settled ? styles.earned : styles.waiting ]}>
                  <Text
                    style={styles.badgeLabel}
                    accessibilityLabel={settled ? spokenAmountLabel(referral.statcoins_earned) : WAITING}
                  >
                    {settled ? `+${earned}` : WAITING}
                  </Text>
                </View>
              </FriendRow>
            </View>
          );
        })}

        {failed ? (
          <View style={styles.state}>
            <Text style={styles.error}>{FAILURE}</Text>
          </View>
        ) : null}
      </Card>
    </View>
  );
};
