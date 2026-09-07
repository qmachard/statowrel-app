/** What each side of a still-pending invitation is waiting on. */
export const NOTES = {
  incoming: 'T’a envoyé une invitation.',
  outgoing: 'Invitation envoyée, en attente.',
};

/**
 * What answers those notes. Accepting is one write, refusing and cancelling are
 * the same delete of both halves (see `data/friendships.ts`) — only what the
 * user is doing differs, so only the wording does.
 */
export const ACTIONS = {
  accept: 'Accepter',
  refuse: 'Refuser',
  cancel: 'Annuler',
};

/** Removing a friend is that same delete, and the only one left in a menu. */
export const REMOVE_LABEL = 'Retirer ce pote';

/** docs/prd.md §5.3 — the empty state takes the place of the list, verbatim. */
export const EMPTY = 'Sans potes, StatOwrel c’est juste des chiffres.';

export const FAILURE = 'Ça n’a pas marché. Vérifie ta connexion et réessaie.';

/**
 * The compatibility card of docs/prd.md §5.3 — everything it can say, in the
 * order it can say it.
 *
 * The score is a **raw agreement rate** (see `v1_friend_compatibility.ts`), so
 * the bands are read as such: half the days is the middle of the scale, not a
 * good result, since two options agree half the time by accident.
 */
export const COMPATIBILITY = {
  title: 'Compatibilité',
  /** Under the percentage — what the number was computed from. */
  detail: (matching: number, common: number) => (
    `${matching} réponse${matching > 1 ? 's' : ''} identique${matching > 1 ? 's' : ''} sur ${common} jour${common > 1 ? 's' : ''} en commun.`
  ),
  /** Not enough shared days to say anything — the card counts down instead of showing a coincidence. */
  tooSoon: (missing: number) => (
    `Encore ${missing} jour${missing > 1 ? 's' : ''} répondu${missing > 1 ? 's' : ''} à deux avant de savoir.`
  ),
  /** No day in common at all, which is a different sentence from « almost there ». */
  empty: 'Vous n’avez pas encore répondu au même jour.',
  failure: 'Compatibilité indisponible pour le moment.',
};

/** The one line the percentage is worth, by band. */
export const COMPATIBILITY_VERDICTS = [
  { from: 80, label: 'Vous êtes la même personne.' },
  { from: 60, label: 'Vous vous ressemblez beaucoup.' },
  { from: 40, label: 'Un jour sur deux, vous êtes d’accord.' },
  { from: 20, label: 'Vous êtes rarement d’accord.' },
  { from: 0, label: 'Tout vous oppose.' },
];
