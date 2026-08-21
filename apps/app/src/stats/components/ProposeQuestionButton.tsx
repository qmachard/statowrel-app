import { Lightbulb, Lock } from 'lucide-react-native';

import { Button } from '@/components/Button';

/**
 * The streak that opens the question proposal of docs/prd.md §4.7. Writing a
 * question for everybody is earned, not given: it takes a month of answering
 * one every day.
 */
export const PROPOSE_QUESTION_STREAK_GOAL = 30;

export interface ProposeQuestionButtonProps {
  /** The streak as the screen reads it — `resolveStreakCount`, not the raw `streak_count`. */
  streak: number;
  /**
   * Opens the proposal form of docs/prd.md §4.7. Left out until that form
   * exists, which keeps the button inert even to whoever has earned it — a
   * locked door is better than one that opens onto nothing.
   */
  onPress?: () => void;
}

/**
 * The bottom of the Stats screen (docs/prd.md §5.2), under the calendar: what
 * the streak is *for*, past the counter. The progress is the button's own small
 * line — a gauge would have taken a card, and a card the height the calendar
 * needs.
 */
export const ProposeQuestionButton = ({ streak, onPress }: ProposeQuestionButtonProps) => {
  const reached = streak >= PROPOSE_QUESTION_STREAK_GOAL;
  // Past the goal the count stops climbing: what the line says is the distance
  // left, and there is none.
  const progress = Math.min(Math.max(streak, 0), PROPOSE_QUESTION_STREAK_GOAL);

  return (
    <Button
      label="Proposer une question"
      description={
        reached
          ? 'Ta série t’en donne le droit.'
          : `${progress} / ${PROPOSE_QUESTION_STREAK_GOAL} jours de série pour publier une question.`
      }
      variant={reached ? 'default' : 'outline'}
      icon={reached ? Lightbulb : Lock}
      disabled={!reached || onPress === undefined}
      onPress={onPress}
    />
  );
};
