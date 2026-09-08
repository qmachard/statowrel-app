import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '@/components/Avatar';
import { Card, CardContent } from '@/components/Card';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';
import { COMPATIBILITY } from '@/friends/copy';
import { useFriendCompatibility } from '@/friends/data/useFriendCompatibility';
import { compatibilityView } from '@/friends/helpers/compatibility';

export interface CompatibilityCardProps {
  /** Firebase Auth UID of the friend the score is about. Must be an accepted friendship — the callable refuses anything else. */
  friendId: string;
  /** Their handle — what the second face is seeded on, already carried by the friendship entry. */
  friendUsername: string;
}

/** How far the second face slides under the first — enough to read as a pair, not enough to hide one. */
const AVATAR_OVERLAP = spacing(3);

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: spacing(2),
  },
  // The two faces, overlapping: the card is about a pair, and two portraits
  // sitting apart would read as a list of two people instead.
  faces: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(1),
  },
  overlapped: {
    marginLeft: -AVATAR_OVERLAP,
  },
  lead: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    textAlign: 'center',
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
 * Read top to bottom it is one sentence: the two faces, « vous êtes
 * compatibles à », the number, and the line that number is worth. The verdict
 * is the punchline and the reason to open the card twice — the percentage
 * alone is a fact, the line under it is what gets screenshotted.
 *
 * The percentage is a **raw agreement rate**: identical picks over the days
 * both answered, jokers and the onboarding demo excluded. Not corrected for how
 * many options each question offered, on purpose — the number is meant to be
 * said out loud, and one nobody can explain is one nobody quotes
 * (`v1_friend_compatibility.ts`). The count under the verdict is what makes it
 * believable rather than arbitrary, which is why it survives in fine print.
 *
 * It is the loud surface of the screen, pink where the stats above it are
 * plain cards and where `primary` yellow already means « ta réponse » on the
 * day sheet and « répondu » on the calendar: the counters above are public
 * information about somebody else, this is the one number about the two of
 * you, so it takes a colour nothing else in the app is built on.
 *
 * Nothing is shown below `COMPATIBILITY_MIN_COMMON_DAYS` shared days — see
 * `helpers/compatibility.ts`. The faces stay in every state, loading and
 * failure included: they are what the card is about, not part of its result.
 */
export const CompatibilityCard = ({ friendId, friendUsername }: CompatibilityCardProps) => {
  const { user, profile } = useAuth();
  const { status, compatibility } = useFriendCompatibility(friendId);

  const view = compatibility === null ? null : compatibilityView(compatibility);

  return (
    <Card variant="notification" shadow="md">
      <CardContent style={styles.content}>
        <View style={styles.faces}>
          {/* Own face first — « vous » read left to right starts with oneself,
              and it is the one that can carry a real picture. */}
          <Avatar size="lg" name={profile?.username ?? user?.email ?? '?'} uri={user?.photoURL} />
          <Avatar size="lg" name={friendUsername} style={styles.overlapped} />
        </View>

        {status === 'loading' ? <ActivityIndicator color={colors['notification-foreground']} /> : null}

        {status === 'error' ? <Text style={styles.state}>{COMPATIBILITY.failure}</Text> : null}

        {view?.kind === 'score' ? (
          <>
            <Text style={styles.lead}>{COMPATIBILITY.lead}</Text>
            <Text style={styles.score}>{view.score}%</Text>
            <Text style={styles.verdict}>{view.verdict}</Text>
            <Text style={styles.detail}>{COMPATIBILITY.detail(view.matching, view.common)}</Text>
          </>
        ) : null}

        {view?.kind === 'too-soon' ? <Text style={styles.state}>{COMPATIBILITY.tooSoon(view.missing)}</Text> : null}

        {view?.kind === 'empty' ? <Text style={styles.state}>{COMPATIBILITY.empty}</Text> : null}
      </CardContent>
    </Card>
  );
};
