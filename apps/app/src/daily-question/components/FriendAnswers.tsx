import { findQuestionOption, type QuestionData } from '@statowrel/models';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, CardContent } from '@/components/Card';
import type { FriendAnswer, FriendAnswersStatus } from '@/daily-question/data/useFriendAnswers';
import { FOREGROUND, type Surface } from '@/daily-question/helpers/surface';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';
import { formatTimeLabel } from '@/lib/dates';

/**
 * The list scrolls inside itself past this height. The sheet's single detent is
 * `fitToContents` (see `RootNavigator`), so an unbounded list of friends would
 * measure taller than the screen and lose its own bottom rows — a bounded
 * scroller measures, a stretched one does not.
 */
const MAX_LIST_HEIGHT = spacing(56);

const styles = StyleSheet.create({
  section: {
    gap: spacing(2),
  },
  heading: {
    fontFamily: fonts.head,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
  },
  list: {
    gap: spacing(3),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },
  // Takes the rest of the row, so a long handle wraps instead of pushing the
  // answer off the card.
  who: {
    flex: 1,
  },
  handle: {
    fontFamily: fonts.head,
    fontSize: fontSize.sm,
    color: colors['card-foreground'],
  },
  time: {
    fontFamily: fonts.sans,
    fontSize: fontSize['2xs'],
    color: colors['muted-foreground'],
  },
  // What they picked, as a bordered chip — never wider than half the row.
  chip: {
    flexShrink: 1,
    overflow: 'hidden',
    borderRadius: radius.sm,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors['card-foreground'],
  },
  // A friend who answered like me wears the same yellow my own row does.
  chipSame: {
    backgroundColor: colors.primary,
  },
  message: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors['muted-foreground'],
  },
});

/** A friend's answer, resolved against the question — what one row renders. */
interface FriendRow {
  friendId: string;
  username: string;
  /** The label of what they picked, `null` for a friend who hasn't answered. */
  optionLabel: string | null;
  timeLabel: string | null;
  /** They picked the same option as this user. */
  same: boolean;
}

/**
 * Those who answered first, one's own answer's twins in front (docs/prd.md
 * §5.5): the yellow chips group at the top, the rest of the day follows, and
 * the friends still to answer close the list.
 */
const rank = (row: FriendRow) => {
  if (row.optionLabel === null) {
    return 2;
  }

  return row.same ? 0 : 1;
};

const toRows = (friends: FriendAnswer[], question: QuestionData, pickedId: string): FriendRow[] => (
  friends
    .map((friend) => {
      const option = friend.optionId === null ? null : findQuestionOption(question.options, friend.optionId);

      return {
        friendId: friend.friendId,
        username: friend.username,
        optionLabel: option?.label ?? null,
        timeLabel: friend.answeredAt === null ? null : formatTimeLabel(new Date(friend.answeredAt)),
        same: friend.optionId === pickedId,
      };
    })
    .sort((a, b) => rank(a) - rank(b) || a.username.localeCompare(b.username))
);

export interface FriendAnswersProps {
  status: FriendAnswersStatus;
  friends: FriendAnswer[];
  question: QuestionData;
  /** `QuestionOptionData.id` this user picked — what makes a friend's answer « comme toi ». */
  pickedOptionId: string;
  /** The sheet's own colour — the heading sits straight on it. */
  surface: Surface;
}

/**
 * The friends' answers of docs/prd.md §4.5, under the recap: `@handle`, the
 * option they picked and the hour they picked it, the ones who answered like me
 * first, the ones who haven't yet at the end.
 *
 * It only ever renders on an answered day — the screen doesn't mount it before,
 * and `useFriendAnswers` reads nothing before either: unlocking your friends by
 * answering yourself is the mechanic, not a loading state (§4.5).
 */
export const FriendAnswers = ({ status, friends, question, pickedOptionId, surface }: FriendAnswersProps) => {
  const rows = useMemo(
    () => toRows(friends, question, pickedOptionId),
    [ friends, question, pickedOptionId ],
  );

  return (
    <View style={styles.section}>
      <Text style={[ styles.heading, FOREGROUND[surface] ]}>Tes potes</Text>

      <Card variant="card" shadow="md">
        <CardContent>
          {status === 'loading' ? <ActivityIndicator /> : null}

          {status === 'error' ? (
            <Text style={styles.message}>Impossible de charger les réponses de tes potes.</Text>
          ) : null}

          {status === 'ready' && rows.length === 0 ? (
            <Text style={styles.message}>Invite un pote pour comparer vos réponses.</Text>
          ) : null}

          {rows.length === 0 ? null : (
            <ScrollView style={{ maxHeight: MAX_LIST_HEIGHT }} contentContainerStyle={styles.list}>
              {rows.map((row) => (
                <View key={row.friendId} style={styles.row}>
                  <View style={styles.who}>
                    <Text style={styles.handle}>@{row.username}</Text>
                    {row.timeLabel === null ? null : <Text style={styles.time}>{row.timeLabel}</Text>}
                  </View>

                  {row.optionLabel === null ? (
                    <Text style={styles.message}>n’a pas encore répondu</Text>
                  ) : (
                    <Text style={[ styles.chip, row.same ? styles.chipSame : null ]} numberOfLines={1}>
                      {row.optionLabel}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </CardContent>
      </Card>
    </View>
  );
};
