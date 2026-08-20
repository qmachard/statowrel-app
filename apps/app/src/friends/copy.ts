/** What each side of a still-pending invitation is waiting on. */
export const NOTES = {
  incoming: 'T’a envoyé une invitation.',
  outgoing: 'Invitation envoyée, en attente.',
};

/**
 * Refusing, cancelling and removing are the same delete (see
 * `data/friendships.ts`) — only what the user is doing differs, so only the
 * wording does.
 */
export const REMOVE_LABELS = {
  accepted: 'Retirer ce pote',
  incoming: 'Refuser l’invitation',
  outgoing: 'Annuler l’invitation',
};

/** docs/prd.md §5.3 — the empty state takes the place of the list, verbatim. */
export const EMPTY = 'Sans potes, StatOwrel c’est juste des chiffres.';

export const FAILURE = 'Ça n’a pas marché. Vérifie ta connexion et réessaie.';
