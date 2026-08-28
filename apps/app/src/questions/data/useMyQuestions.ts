import {
  type Identifiable,
  QUESTION_COLLECTION,
  type QuestionData,
  questionConverter,
} from '@statowrel/models';
import { onSnapshot, orderBy, query, where } from '@react-native-firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/auth/AuthContext';
import { getCollectionRef } from '@/lib/firestore';

/** A proposal in its author's own list — the id is the row's key, not a read. */
export type MyQuestion = Identifiable<QuestionData>;

export interface MyQuestions {
  /** Newest first: a proposal is checked on for its verdict, and the last one sent is the one being waited on. */
  questions: MyQuestion[];
  /** True until the first snapshot lands — never true again afterwards. */
  loading: boolean;
  /** The subscription could not be established, or was lost. */
  failed: boolean;
}

/** What the last snapshot said — `null` until one has landed. */
interface Landed {
  questions: MyQuestion[];
  failed: boolean;
}

const EMPTY: MyQuestions = { questions: [], loading: false, failed: false };

/**
 * Everything in `v1_questions` this account proposed, live — docs/prd.md §5.3.
 *
 * **The one query the app runs against `v1_questions`.** Every other read is a
 * document by its id: the day screen resolves a day through
 * `v1_daily_question_months` and reads that one question, the onboarding reads
 * the demo by `DEMO_QUESTION_ID`. This is a `list`, and `firestore.rules` only
 * ever grants it under the `where` clause below — `allow read: if
 * isOwner(resource.data.author_id)` is evaluated per document, so a query that
 * does not pin `author_id` to the caller is refused outright rather than
 * filtered down. The filter is the permission, not an optimisation.
 *
 * **It needs the composite index** `author_id` ASC + `created_at` DESC, in
 * `packages/firestore-config/firestore.indexes.json`: an equality plus a sort
 * on another field is exactly what Firestore refuses to serve from the
 * single-field indexes. Until it is deployed, this list is permanently in its
 * `failed` state — which is why that state has a sentence of its own rather
 * than rendering as « aucune question ».
 *
 * Subscribed rather than read once, and for the same reason the moderation
 * console subscribes: the verdict comes from somebody else's device entirely. A
 * moderator can approve or reject while this screen is open, and the 07:00 draw
 * can turn a proposal into a day under it.
 *
 * The loading flag is derived rather than stored, exactly as in
 * `friends/data/useFriends.ts`: « no snapshot yet, and there is a session » is
 * what loading *is*, and writing it down would mean setting state from the
 * effect body on every sign-in.
 */
export const useMyQuestions = (): MyQuestions => {
  const { user } = useAuth();
  const userId = user?.uid ?? null;

  const [ landed, setLanded ] = useState<Landed | null>(null);

  useEffect(() => {
    if (userId === null) {
      return undefined;
    }

    const mine = query(
      getCollectionRef(QUESTION_COLLECTION, questionConverter),
      where('author_id', '==', userId),
      orderBy('created_at', 'desc'),
    );

    return onSnapshot(
      mine,
      (snapshot) => setLanded({
        questions: snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id })),
        failed: false,
      }),
      (error: unknown) => {
        // The rest of the Menu screen stays up, exactly as the friend list does
        // — but this one says so on the card: a failed read reads as « no
        // proposals » otherwise, which is the one wrong thing to tell somebody
        // who has just paid 100§ for one.
        console.warn('[questions] could not read the proposals', error);
        setLanded({ questions: [], failed: true });
      },
    );
  }, [ userId ]);

  return useMemo(() => {
    if (landed === null) {
      return userId === null ? EMPTY : { ...EMPTY, loading: true };
    }

    return { ...landed, loading: false };
  }, [ landed, userId ]);
};
