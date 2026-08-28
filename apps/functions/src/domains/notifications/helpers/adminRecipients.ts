import { logger } from 'firebase-functions/v2';

import { getAuth } from '@/libs/firebase-admin';

/** `listUsers` takes at most 1000 per page. */
const USERS_PER_PAGE = 1000;

/**
 * The e-mail addresses of everyone holding the `admin` custom claim.
 *
 * Firebase Auth is the only place an administrator is recorded: the claim is
 * what `isAdmin()` tests in `firestore.rules` and what `npm run set-admin`
 * grants, and no collection mirrors it. So the list is walked rather than
 * queried — Auth has no "users with claim X" filter, and a claim is not
 * indexable. That is fine at this size and would not be at a hundred thousand
 * accounts; the day it stops being fine, the answer is a small
 * `v1_administrators` collection the grant script writes alongside the claim,
 * not a bigger walk.
 *
 * An admin without an address is dropped rather than failing the run: an
 * account created straight in the console can carry no e-mail at all, and the
 * other moderators should still get their digest.
 */
export const listAdminEmails = async (): Promise<string[]> => {
  const auth = getAuth();
  const addresses = new Set<string>();
  let missingAddress = 0;
  let pageToken: string | undefined;

  do {
    const page = await auth.listUsers(USERS_PER_PAGE, pageToken);

    for (const user of page.users) {
      if (user.customClaims?.admin !== true) {
        continue;
      }

      if (user.email) {
        // Lower-cased so the same moderator reached under two spellings is one
        // recipient, not two copies of the same mail.
        addresses.add(user.email.toLowerCase());
      } else {
        missingAddress += 1;
      }
    }

    pageToken = page.pageToken;
  } while (pageToken);

  if (missingAddress > 0) {
    logger.warn('Admin accounts carry no e-mail address and cannot be mailed', { count: missingAddress });
  }

  return [ ...addresses ];
};
