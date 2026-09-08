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
  /** The lead-in over the percentage — « vous », because this number is the only one in the app about two people. */
  lead: 'Vous êtes compatibles à',
  /** The fine print under the verdict — what the number was computed from, so it can be believed. */
  detail: (matching: number, common: number) => (
    `${matching} réponse${matching > 1 ? 's' : ''} identique${matching > 1 ? 's' : ''} sur ${common} jour${common > 1 ? 's' : ''} en commun.`
  ),
  /** Not enough shared days to say anything — the card counts down instead of showing a coincidence. */
  tooSoon: (missing: number) => (
    `Encore ${missing} jour${missing > 1 ? 's' : ''} répondu${missing > 1 ? 's' : ''} à deux et on vous dit tout.`
  ),
  /** No day in common at all, which is a different sentence from « almost there ». */
  empty: 'Vous n’avez pas encore répondu au même jour.',
  failure: 'Compatibilité indisponible pour le moment.',
};

/**
 * The line the percentage is worth, by band — the punchline under the number,
 * and the reason the card is worth opening twice.
 *
 * Read against a raw agreement rate: **half is the middle of the scale**, not a
 * good score, two options agreeing half the time on their own. Which is why
 * 40-60 is « pile ou face » and not « pas mal ».
 *
 * The list is ordered high to low — `compatibilityView` takes the first band
 * the score clears.
 */
export const COMPATIBILITY_VERDICTS = [
  { from: 90, label: 'C’est louche. Vous êtes sûrs d’être deux ?' },
  { from: 75, label: 'Même cerveau, deux téléphones.' },
  { from: 60, label: 'Raccord sur l’essentiel.' },
  { from: 40, label: 'Un jour d’accord, un jour pas. Pile ou face.' },
  { from: 25, label: 'Les opposés s’attirent, paraît-il.' },
  { from: 0, label: 'Tout vous oppose. Et vous êtes potes quand même.' },
];
