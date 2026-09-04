/**
 * Everything « Mes filleuls » says — docs/prd.md §4.9.
 *
 * The card answers one question, and it is the one the whole rail exists for:
 * *did the person I sent my link to actually arrive?* So a row exists from the
 * moment somebody names this account at sign-up, not from the moment it pays.
 */
export const TITLE = 'Mes filleuls';

/** In the list's own place when nobody has come through yet — same shape as the friend list's. */
export const EMPTY = 'Partage ton pseudo : chaque pote qui arrive vous rapporte à tous les deux.';

export const FAILURE = 'Ça n’a pas marché. Vérifie ta connexion et réessaie.';

/** What a row that has not paid out yet is waiting on. */
export const WAITING = 'En attente';

/** What it is waiting *for*, under the handle. */
export const WAITING_NOTE = 'Dès sa première réponse.';

export const SHARE_LABEL = 'Partager mon lien';

/**
 * The message the share sheet sends, built around the handle rather than a
 * link: until universal links ship, a `statowrel://` URL opens nothing on a
 * phone that has not installed the app — which is every phone this message is
 * for. So the site is the destination and the handle is the code, typed once at
 * sign-up.
 */
export const shareMessage = (username: string, reward: number): string => (
  `Rejoins-moi sur StatOwrel : https://statowrel-app.web.app\n`
  + `Mets @${username} dans « Qui t'a fait venir ? » à l'inscription, on gagne ${reward}§ chacun.`
);
