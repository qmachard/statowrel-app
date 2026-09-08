import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Card, CardContent } from '@/components/Card';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';
import { COMPATIBILITY } from '@/friends/copy';
import { useFriendCompatibility } from '@/friends/data/useFriendCompatibility';
import { compatibilityView } from '@/friends/helpers/compatibility';

export interface CompatibilityCardProps {
  /** Firebase Auth UID of the friend the score is about. Must be an accepted friendship — the callable refuses anything else. */
  friendId: string;
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: spacing(2),
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    color: colors['notification-foreground'],
  },
  // The score at the streak count's own scale: it is the one number this
  // screen exists for, and nothing beside it competes.
  score: {
    fontFamily: fonts.head,
    fontSize: fontSize['7xl'],
    lineHeight: fontSize['7xl'],
    color: colors['notification-foreground'],
  },
  verdict: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.base,
    textAlign: 'center',
    color: colors['notification-foreground'],
  },
  detail: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textAlign: 'center',
    color: colors['notification-foreground'],
  },
  state: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    textAlign: 'center',
    color: colors['notification-foreground'],
  },
});

/**
 * How alike a friend answered — docs/prd.md §5.3, and the reason the friend
 * screen exists.
 *
 * The percentage is a **raw agreement rate**: identical picks over the days
 * both answered, jokers and the onboarding demo excluded. Not corrected for how
 * many options each question offered, on purpose — the number is meant to be
 * said out loud, and one nobody can explain is one nobody quotes
 * (`v1_friend_compatibility.ts`).
 *
 * It is the loud surface of the screen, pink where the stats above it are
 * plain cards and where `primary` yellow already means « ta réponse » on the
 * day sheet and « répondu » on the calendar: the counters above are public
 * information about somebody else, this is the one number about the two of
 * you, so it takes a colour nothing else in the app is built on.
 *
 * Nothing is shown below `COMPATIBILITY_MIN_COMMON_DAYS` shared days — see
 * `helpers/compatibility.ts`.
 */
export const CompatibilityCard = ({ friendId }: CompatibilityCardProps) => {
  const { status, compatibility } = useFriendCompatibility(friendId);

  const view = compatibility === null ? null : compatibilityView(compatibility);

  return (
    <Card variant="notification" shadow="md">
      <CardContent style={styles.content}>
        <Text style={styles.label}>{COMPATIBILITY.title}</Text>

        {status === 'loading' ? <ActivityIndicator color={colors['notification-foreground']} /> : null}

        {status === 'error' ? <Text style={styles.state}>{COMPATIBILITY.failure}</Text> : null}

        {view?.kind === 'score' ? (
          <View style={styles.content}>
            <Text style={styles.score}>{view.score}%</Text>
            <Text style={styles.verdict}>{view.verdict}</Text>
            <Text style={styles.detail}>{COMPATIBILITY.detail(view.matching, view.common)}</Text>
          </View>
        ) : null}

        {view?.kind === 'too-soon' ? <Text style={styles.state}>{COMPATIBILITY.tooSoon(view.missing)}</Text> : null}

        {view?.kind === 'empty' ? <Text style={styles.state}>{COMPATIBILITY.empty}</Text> : null}
      </CardContent>
    </Card>
  );
};
