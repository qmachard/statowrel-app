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
    color: colors['primary-foreground'],
  },
  // The score at the streak count's own scale: it is the one number this
  // screen exists for, and nothing beside it competes.
  score: {
    fontFamily: fonts.head,
    fontSize: fontSize['7xl'],
    lineHeight: fontSize['7xl'],
    color: colors['primary-foreground'],
  },
  verdict: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.base,
    textAlign: 'center',
    color: colors['primary-foreground'],
  },
  detail: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textAlign: 'center',
    color: colors['primary-foreground'],
  },
  state: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    textAlign: 'center',
    color: colors['primary-foreground'],
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
 * It is the loud surface of the screen, `primary` where the stats above it are
 * plain cards: the streak is public information about somebody else, this is
 * about the two of you.
 *
 * Nothing is shown below `COMPATIBILITY_MIN_COMMON_DAYS` shared days — see
 * `helpers/compatibility.ts`.
 */
export const CompatibilityCard = ({ friendId }: CompatibilityCardProps) => {
  const { status, compatibility } = useFriendCompatibility(friendId);

  const view = compatibility === null ? null : compatibilityView(compatibility);

  return (
    <Card variant="primary" shadow="md">
      <CardContent style={styles.content}>
        <Text style={styles.label}>{COMPATIBILITY.title}</Text>

        {status === 'loading' ? <ActivityIndicator color={colors['primary-foreground']} /> : null}

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
