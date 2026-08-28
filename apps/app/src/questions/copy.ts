import { amountLabel, spokenAmountLabel } from '@/lib/statcoins';

/**
 * What a proposal's badge says, per state — docs/prd.md §5.3, which asks for
 * « en attente / validée / rejetée + raison / tirée le JJ/MM ».
 *
 * Four words rather than four sentences: the badge is read at a glance down a
 * list, and everything a state still owes — the reason it was refused, the
 * money handed back — goes on the line under it.
 */
export const STATUS = {
  waiting: 'En attente',
  approved: 'Validée',
  /** Completed by the day itself: « Tirée le 19/08 ». */
  drawn: 'Tirée le',
  rejected: 'Rejetée',
};

/**
 * What a rejection hands back, said on the row itself.
 *
 * Without it a refused proposal reads as 100§ burnt by somebody else's verdict,
 * which is exactly what `questions-onQuestionRejected` exists not to do: the
 * price buys a place in the pot, not a verdict. The refund is silent everywhere
 * else — no notification, no line in the wallet — so this row is the only place
 * the app can say it.
 */
export const refunded = (amount: number) => `Tes ${amountLabel(amount)} t’ont été rendus.`;

/** The same sentence for a screen reader, which reads a lone `§` as a section sign. */
export const spokenRefunded = (amount: number) => `Tes ${spokenAmountLabel(amount)} t’ont été rendus.`;

/**
 * The empty state takes the place of the list, like the friend list's own.
 *
 * It names where the door is, which the friend list does not have to: proposing
 * lives on the Stats screen, beside the wallet that pays for it (docs/prd.md
 * §5.2 point 6), so a card that only ever lists proposals would otherwise leave
 * somebody with nothing to do about it.
 */
export const EMPTY = 'Aucune question proposée. Pose la tienne depuis l’écran Stats.';

export const FAILURE = 'Impossible de charger tes questions. Vérifie ta connexion et réessaie.';
