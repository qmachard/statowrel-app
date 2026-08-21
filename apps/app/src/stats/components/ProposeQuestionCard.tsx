import { Lightbulb, Lock } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card, CardContent } from '@/components/Card';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

/**
 * The streak that opens the question proposal of docs/prd.md §4.7. Writing a
 * question for everybody is earned, not given: it takes a month of answering
 * one every day.
 */
export const PROPOSE_QUESTION_STREAK_GOAL = 30;

export interface ProposeQuestionCardProps {
  /** The streak as the screen reads it — `resolveStreakCount`, not the raw `streak_count`. */
  streak: number;
  /**
   * Opens the proposal form of docs/prd.md §4.7. Left out until that form
   * exists, which keeps the button inert even to whoever has earned it — a
   * locked door is better than one that opens onto nothing.
   */
  onPress?: () => void;
}

const styles = StyleSheet.create({
  content: {
    gap: spacing(4),
  },
  message: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors['muted-foreground'],
  },
  progress: {
    gap: spacing(2),
  },
  // The track carries the same border as every other surface, so the fill can
  // be a flat block of `primary` inside it rather than a bar floating on the page.
  track: {
    height: spacing(3),
    borderWidth,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  count: {
    fontFamily: fonts.head,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
});

const LOCKED_MESSAGE = `Tu dois atteindre une série de ${PROPOSE_QUESTION_STREAK_GOAL} pour publier une question.`;

const UNLOCKED_MESSAGE = 'Ta série te donne le droit d’écrire la question de tout le monde.';

/**
 * The bottom of the Stats screen (docs/prd.md §5.2), under the calendar: what
 * the streak is *for*, past the counter. Below the goal it is a closed door
 * showing how far off it is — the message, the gauge and a button one cannot
 * press; at the goal the door is the same shape, with the reason gone.
 */
export const ProposeQuestionCard = ({ streak, onPress }: ProposeQuestionCardProps) => {
  const reached = streak >= PROPOSE_QUESTION_STREAK_GOAL;
  // A streak past the goal keeps the gauge full rather than overflowing it, and
  // a negative one can't exist — but the clamp costs nothing and the bar can
  // never be drawn outside its own track.
  const ratio = Math.min(Math.max(streak, 0), PROPOSE_QUESTION_STREAK_GOAL) / PROPOSE_QUESTION_STREAK_GOAL;

  return (
    <Card variant={reached ? 'card' : 'muted'}>
      <CardContent style={styles.content}>
        <Text style={styles.message}>{reached ? UNLOCKED_MESSAGE : LOCKED_MESSAGE}</Text>

        <View
          style={styles.progress}
          accessibilityRole="progressbar"
          accessibilityLabel="Progression vers la proposition de question"
          accessibilityValue={{ min: 0, max: PROPOSE_QUESTION_STREAK_GOAL, now: Math.min(streak, PROPOSE_QUESTION_STREAK_GOAL) }}
        >
          <View style={styles.track}>
            <View style={[ styles.fill, { width: `${ratio * 100}%` } ]} />
          </View>
          <Text style={styles.count}>
            {Math.min(streak, PROPOSE_QUESTION_STREAK_GOAL)} / {PROPOSE_QUESTION_STREAK_GOAL} jours
          </Text>
        </View>

        <Button
          label="Proposer une question"
          variant={reached ? 'default' : 'outline'}
          icon={reached ? Lightbulb : Lock}
          disabled={!reached || onPress === undefined}
          onPress={onPress}
        />
      </CardContent>
    </Card>
  );
};
