import { JOKER_STATFLOUZZ_COST } from '@statowrel/models';

import { isFirebaseError } from '@/lib/firebaseError';
import { amountLabel } from '@/lib/statflouzz';

/**
 * `functions/*` codes `questions-useJoker` raises on purpose — see the
 * callable itself for the exhaustive list. Anything else is a transport
 * failure and falls back below.
 *
 * `failed-precondition` covers four distinct refusals on the backend
 * (not today's question, already answered, already jokered, wallet short of
 * `JOKER_STATFLOUZZ_COST`) — the first three are protected against by the
 * button hiding itself, so the message the user actually sees for this code
 * is the wallet one. The three other cases are inert re-taps we still
 * defend against.
 */
const FAILURES: Record<string, string> = {
  'functions/failed-precondition': `Il te manque des StatFlouzz : un Joker coûte ${amountLabel(JOKER_STATFLOUZZ_COST)}. Réponds à la question du jour pour en gagner.`,
  'functions/invalid-argument': 'Ta demande n\'est pas valide. Réessaie dans un instant.',
  'functions/not-found': 'Ton profil est incomplet. Reconnecte-toi et réessaie.',
  'functions/unauthenticated': 'Reconnecte-toi pour utiliser un Joker.',
};

const FALLBACK = 'Ton Joker n\'est pas parti. Vérifie ta connexion et réessaie.';

/** Never returns a raw `functions/*` code — same discipline as the other translators. */
export const jokerFailure = (error: unknown): string => {
  if (isFirebaseError(error)) {
    console.warn(`[daily-question] joker failed with ${error.code}`, error.message);

    return FAILURES[error.code] ?? FALLBACK;
  }

  console.warn('[daily-question] joker failed', error);

  return FALLBACK;
};
