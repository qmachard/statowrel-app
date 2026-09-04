import { amountLabel, spokenAmountLabel } from '@/lib/statflouzz';

/**
 * What the referral says on screen — docs/prd.md §4.9.
 *
 * There is no « Mes filleuls » list: bringing somebody in is a thing to *do*,
 * not a thing to come back and read, so the whole rail surfaces in the one
 * place the app already asks for a friend — the invitation sheet — and the
 * sponsor hears about it through the push the payout sends.
 */

/**
 * Why a second way in sits under a field that already takes a handle, and what
 * it pays.
 *
 * This one quotes the **sponsor's** reward, where `shareMessage` below quotes
 * the newcomer's: the two are read by different people. This line is on the
 * sponsor's own screen and is what makes them press the button; the message is
 * read by somebody being asked for a favour.
 *
 * It names the condition in the same breath — the payout waits for the
 * newcomer's first answer — because a line promising the StatFlouzz at sign-up
 * would read as a bug on the days they do not land.
 */
export const shareHelp = (reward: number): string => (
  `Ton pote n’est pas encore sur StatOwrel ? Envoie-lui ton lien : ${amountLabel(reward)} pour toi dès sa première réponse.`
);

/** The same line spelled out, a lone `§` being read as a section sign. */
export const spokenShareHelp = (reward: number): string => (
  `Ton pote n’est pas encore sur StatOwrel ? Envoie-lui ton lien : ${spokenAmountLabel(reward)} pour toi dès sa première réponse.`
);

export const SHARE_LABEL = 'Partager mon lien';

/**
 * The message the share sheet sends, built around the handle rather than a
 * link: until universal links ship, a `statowrel://` URL opens nothing on a
 * phone that has not installed the app — which is every phone this message is
 * for. So the site is the destination and the handle is the code, typed once at
 * sign-up.
 *
 * It names the **newcomer's** bonus and never the sender's larger one: the
 * message is read by somebody being asked for a favour, and a favour that opens
 * by saying what it pays the asker is not an invitation.
 */
export const shareMessage = (username: string, bonus: number): string => (
  `Rejoins-moi sur StatOwrel : https://statowrel-app.web.app\n`
  + `Mets @${username} dans « Qui t'a fait venir ? » à l'inscription, tu gagnes ${amountLabel(bonus)}.`
);
