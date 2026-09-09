import { JOKER_STATFLOUZZ_COST } from '@statowrel/models';
import { Alert } from 'react-native';

import { amountLabel } from '@/lib/statflouzz';

const TITLE = 'Passer cette journée ?';
const MESSAGE = `Ta journée sera comptée et ta série préservée. Tu dépenseras ${amountLabel(JOKER_STATFLOUZZ_COST)}. Cette action est irréversible.`;
const ACCEPT = 'Passer';
const CANCEL = 'Annuler';

/**
 * The confirmation a joker always goes through — docs/prd.md §4.8.
 *
 * It lives here rather than inside `JokerButton` because it now has two
 * callers, and the wording is the promise: a joker is irreversible on both
 * directions, the day is passed and the StatFlouzz are spent, and neither
 * comes back on a mis-tap. Two dialogs saying it two ways would be two
 * promises.
 *
 * The second caller is the 21:00 streak reminder (docs/prd.md §4.6): tapping
 * it opens the day *and* raises this, so saving a série is the notification
 * and one confirmation. Which is also why the reminder does not act on its
 * own — it carries the shortest route to the joker, not the joker itself, and
 * spending somebody's StatFlouzz on a lock-screen tap is not a shortcut, it is
 * a bill.
 *
 * This is also where the price is finally stated in full. The notification
 * deliberately does not carry it (see `helpers/streakReminder.ts` on the
 * backend): one screen later is where a number can be read rather than
 * glanced at.
 */
export const confirmJoker = (onConfirm: () => void): void => {
  Alert.alert(TITLE, MESSAGE, [
    { text: CANCEL, style: 'cancel' },
    { text: ACCEPT, style: 'default', onPress: onConfirm },
  ]);
};
