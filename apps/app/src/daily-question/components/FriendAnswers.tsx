import { findQuestionOption, type QuestionData } from '@statowrel/models';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import type { FriendAnswer, FriendAnswersStatus } from '@/daily-question/data/useFriendAnswers';
import { statLabelOf } from '@/daily-question/helpers/statowrel';
import { FOREGROUND, type Surface } from '@/daily-question/helpers/surface';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';
import { FriendRow } from '@/friends/components/FriendRow';
import { formatTimeLabel } from '@/lib/dates';

/** A picked option never takes more than this much of a row — the handle keeps the rest. */
const CHIP_MAX_WIDTH = spacing(32);

const styles = StyleSheet.create({
  section: {
    gap: spacing(2),
  },
  heading: {
    fontFamily: fonts.head,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
  },
  // The card *is* the list — no padding of its own, no gap between the rows, the
  // separators do that work. Same anatomy as the Menu screen's friend list, so
  // one friend reads the same way wherever they show up.
  list: {
    gap: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  separated: {
    borderTopWidth: borderWidth,
    borderTopColor: colors.border,
  },
  // The StatOwrel they earned, as a bordered chip — capped, so a long one never
  // squeezes the handle beside it.
  chip: {
    maxWidth: CHIP_MAX_WIDTH,
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
  pending: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors['muted-foreground'],
  },
  // The one-liner that stands in for the whole section — on the sheet, so it
  // takes the surface's own foreground rather than the card's muted grey.
  notice: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
  },
});

/** A friend's answer, resolved against the question — what one row renders. */
interface Row {
  friendId: string;
  username: string;
  photoUrl: string | null | undefined;
  /** The StatOwrel of what they picked, `null` for a friend who hasn't answered. */
  statLabel: string | null;
  timeLabel: string | null;
  /** They picked the same option as this user. */
  same: boolean;
}

/**
 * Those who answered first, one's own answer's twins in front (docs/prd.md
 * §5.5): the yellow chips group at the top, the rest of the day follows, and
 * the friends still to answer close the list.
 */
const rank = (row: Row) => {
  if (row.statLabel === null) {
    return 2;
  }

  return row.same ? 0 : 1;
};

const toRows = (friends: FriendAnswer[], question: QuestionData, pickedId: string): Row[] => (
  friends
    .map((friend) => {
      const option = friend.optionId === null ? null : findQuestionOption(question.options, friend.optionId);

      return {
        friendId: friend.friendId,
        username: friend.username,
        photoUrl: friend.photoUrl,
        statLabel: option === null ? null : statLabelOf(option),
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
 * StatOwrel their answer earned them and the hour they picked it, the ones who
 * answered like me first, the ones who haven't yet at the end.
 *
 * It only ever renders on an answered day — the screen doesn't mount it before,
 * and `useFriendAnswers` reads nothing before either: unlocking your friends by
 * answering yourself is the mechanic, not a loading state (§4.5).
 *
 * The list carries no scroller of its own: the sheet's whole column is the
 * scroller (`DailyQuestionScreen`), so however many friends there are they read
 * as one list rather than through a three-row window, and dragging never has to
 * pick between two scrollers stacked on each other.
 *
 * With nobody to list it collapses to a single line on the sheet, card and
 * heading included: an account with no friends yet is the common case, and a
 * framed section holding one grey sentence looks like a section that broke.
 */
export const FriendAnswers = ({ status, friends, question, pickedOptionId, surface }: FriendAnswersProps) => {
  const rows = useMemo(
    () => toRows(friends, question, pickedOptionId),
    [ friends, question, pickedOptionId ],
  );

  // Nothing to list is not an empty card: a card with one grey sentence in it
  // reads as a section that failed to load. The sentence goes straight on the
  // sheet instead, in its foreground — `muted-foreground` is unreadable there —
  // and takes the heading's place rather than sitting under it.
  if (rows.length === 0) {
    if (status === 'loading') {
      return null;
    }

    return (
      <Text style={[ styles.notice, FOREGROUND[surface] ]}>
        {status === 'error'
          ? 'Impossible de charger les réponses de tes potes.'
          : 'Invite un pote pour comparer vos réponses.'}
      </Text>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[ styles.heading, FOREGROUND[surface] ]}>Tes potes</Text>

      <Card style={styles.list}>
        {rows.map((row, index) => (
          <View key={row.friendId} style={index === 0 ? null : styles.separated}>
            <FriendRow
              username={row.username}
              photoUrl={row.photoUrl}
              note={row.timeLabel ?? undefined}
            >
              {row.statLabel === null ? (
                <Text style={styles.pending}>n’a pas encore répondu</Text>
              ) : (
                <Text style={[ styles.chip, row.same ? styles.chipSame : null ]} numberOfLines={1}>
                  {row.statLabel}
                </Text>
              )}
            </FriendRow>
          </View>
        ))}
      </Card>
    </View>
  );
};
