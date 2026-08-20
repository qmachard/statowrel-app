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
