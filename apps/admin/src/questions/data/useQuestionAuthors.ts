import { getDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';

import { USER_COLLECTION, userConverter } from '@statowrel/models';

import { getDocumentRef } from '@/lib/firestore';

/** Handle per author UID. A UID absent from the map is still being read, or has no profile. */
export type QuestionAuthors = Record<string, string>;

/**
 * Resolves the handles behind the `author_id`s the pot has left uncredited.
 *
 * **Temporary.** A question carries its author's handle now
 * (`author_username`), so the column reads it off the row and this hook only
 * sees the questions written before that field existed — the same fallback
 * `questionLastModifiedAt` makes onto `created_at`. Delete it, and the filter
 * feeding it, once `npm run backfill-question-authors` has run in production.
 *
 * One `getDoc` per *distinct* author, once. Read rather than subscribed: a
 * handle is stable, and the backoffice does not need to watch it move.
 *
 * A UID whose profile is missing — a seeded question, an account deleted since —
 * is cached as an empty string, so the failed read is not retried on every
 * snapshot.
 */
export const useQuestionAuthors = (authorIds: string[]): QuestionAuthors => {
  const [ authors, setAuthors ] = useState<QuestionAuthors>({});
  // The requested set, not the resolved one: two snapshots landing back to back
  // must not fire the same read twice while the first is still in flight.
  const requested = useRef(new Set<string>());

  // The array identity changes on every snapshot, so the effect keys off the
  // UIDs themselves — the pot's authors, not the pot.
  const key = authorIds.join(',');

  useEffect(() => {
    const missing = authorIds.filter((id) => id !== '' && !requested.current.has(id));

    if (missing.length === 0) {
      return;
    }

    missing.forEach((id) => requested.current.add(id));

    void Promise.all(missing.map(async (id) => {
      try {
        const snapshot = await getDoc(getDocumentRef(USER_COLLECTION, id, userConverter));

        return [ id, snapshot.data()?.username ?? '' ] as const;
      } catch (cause) {
        console.warn('[questions] could not read an author profile', cause);

        return [ id, '' ] as const;
      }
    })).then((entries) => {
      setAuthors((current) => ({ ...current, ...Object.fromEntries(entries) }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ key ]);

  return authors;
};
