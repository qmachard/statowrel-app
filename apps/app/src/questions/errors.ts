import { QUESTION_STATCOIN_COST } from '@statowrel/models';

import { isFirebaseError } from '@/lib/firebaseError';
import { amountLabel } from '@/lib/statcoins';

/**
 * `functions/*` codes `questions-proposeQuestion` raises on purpose — see
 * `apps/functions/src/domains/questions/callables/proposeQuestion.ts`. Anything
 * else is a transport failure and falls back below.
 *
 * **An empty wallet has its own sentence**, and it is the reason this table
 * exists at all: it is the one refusal the user can do something about, and
 * « réessaie » would be exactly the wrong advice. So it names the price and
 * where the StatCoins come from, which is the rule the card behind this sheet
 * already states.
 *
 * `not-found` is a signed-in account with no profile document — somebody who
 * has not been through the username sheet. It cannot happen from this screen,
 * which only opens over the Stats screen a profile is read for, and it is
 * translated rather than left to the fallback because « vérifie ta connexion »
 * would send them looking in the wrong place.
 */
const FAILURES: Record<string, string> = {
  'functions/failed-precondition': `Il te manque des StatCoins : une question coûte ${amountLabel(QUESTION_STATCOIN_COST)}. Réponds à la question du jour pour en gagner.`,
  'functions/invalid-argument': 'Ta question n\'est pas valide. Vérifie l\'intitulé et les réponses.',
  'functions/not-found': 'Ton profil est incomplet. Reconnecte-toi et réessaie.',
  'functions/unauthenticated': 'Reconnecte-toi pour poser une question.',
};

const FALLBACK = 'Ta question n\'est pas partie. Vérifie ta connexion et réessaie.';

/**
 * Never returns a raw `functions/*` code — the code goes to the console
 * instead, the way `src/friends/errors.ts` and `src/auth/errors.ts` do.
 *
 * One message, shown above the submit button rather than under a field: none of
 * these is about a single answer the user typed, and the two that are about the
 * form at all (`invalid-argument`) have already been caught by the schema
 * before the call was made.
 */
export const proposalFailure = (error: unknown): string => {
  if (isFirebaseError(error)) {
    console.warn(`[questions] proposal failed with ${error.code}`, error.message);

    return FAILURES[error.code] ?? FALLBACK;
  }

  console.warn('[questions] proposal failed', error);

  return FALLBACK;
};
