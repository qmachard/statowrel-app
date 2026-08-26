import {
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type FirestoreDataConverter,
  GeoPoint,
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocFromCache,
} from '@react-native-firebase/firestore';

import type { FirestoreConverter } from '@statowrel/models';

import { db } from './firebase';

/**
 * Client-side counterpart of `apps/functions/src/libs/firebase-admin.ts`: every
 * ref is built with a `@statowrel/models` converter, so nothing in the app ever
 * reads `snap.data()` untyped.
 *
 * The cast is the same one the admin helpers make, and it now spans one SDK
 * more. `@statowrel/models` types its converters against `UniversalSnapshot` —
 * the admin SDK's snapshot or the *web* SDK's, the two the package declares —
 * while this app runs on React Native Firebase, whose `Timestamp`, `GeoPoint`
 * and snapshot classes are its own. They carry the same shape and the same
 * wire format (`toDate()`, `fromDate()`, `seconds`/`nanoseconds`), which is
 * what makes a converter written against one work against another; the type
 * system has no way to know that, and teaching `packages/models` a third SDK
 * would mean linking React Native's typings into a package `apps/functions`
 * also builds. So the cast stays here, at the one seam that knows which SDK it
 * is talking to.
 */
const withConverter = <TModelData extends DocumentData, TFirebaseData extends DocumentData = TModelData>(
  converter: FirestoreConverter<TModelData, TFirebaseData>,
) => {
  const built = converter(
    Timestamp as unknown as Parameters<typeof converter>[0],
    GeoPoint as unknown as Parameters<typeof converter>[1],
  );

  return {
    toFirestore: built.toFirestore,
    /**
     * **A document that does not exist reads as `undefined`, and the converter
     * is not run on it.** That is the web SDK's contract, and the one every
     * call site in this app was written against — `snapshot.data() ?? null` in
     * `AuthContext`, `published.data()?.days ?? {}` in the calendar cache,
     * `reservation.data()?.created_at` in `profile.ts`.
     *
     * React Native Firebase does not honour it. Its `DocumentSnapshot.data()`
     * calls `fromFirestore` unconditionally, existing document or not, and the
     * snapshot it hands over then answers `undefined` to its own `data()`. Our
     * converters all open on `const data = snap.data()` and read a field off
     * it, so a missing document threw instead of reading as absent:
     *
     *     firebase.firestore() DocumentSnapshot.data(*) 'withConverter.fromFirestore'
     *     threw an error: Cannot read property 'username' of undefined.
     *
     * Which is not an edge case here — `v1_users/{uid}` not existing yet is
     * precisely how the app knows an account has still to choose a handle
     * (`needsOnboarding`), and the same goes for a month with no calendar, a
     * handle nobody has reserved, a device never registered.
     *
     * Restoring the contract here rather than in `@statowrel/models` is
     * deliberate twice over: the converters stay shared with `apps/functions`,
     * which does not need this; and a converter made to tolerate a missing
     * document would have to return a fully defaulted object, quietly turning
     * « no document » into « empty document » — the one distinction half this
     * app's logic is built on.
     */
    fromFirestore: (snapshot: { exists: () => boolean }) => (
      snapshot.exists()
        ? built.fromFirestore(snapshot as unknown as Parameters<typeof built.fromFirestore>[0])
        : undefined
    ),
  } as unknown as FirestoreDataConverter<TModelData, TFirebaseData>;
};

export const getDocumentRef = <TModelData extends DocumentData, TFirebaseData extends DocumentData = TModelData>(
  collectionPath: string,
  identifier: string,
  converter: FirestoreConverter<TModelData, TFirebaseData>,
) => doc(db, collectionPath, identifier).withConverter(withConverter(converter));

export const getCollectionRef = <TModelData extends DocumentData, TFirebaseData extends DocumentData = TModelData>(
  collectionPath: string,
  converter: FirestoreConverter<TModelData, TFirebaseData>,
) => collection(db, collectionPath).withConverter(withConverter(converter));

/**
 * A document inside a sub-collection —
 * `getSubDocumentRef('v1_questions', questionId, 'v1_daily_question_answers', uid, converter)`.
 *
 * The path segments are passed flat rather than as a parent ref: a parent built
 * by `getDocumentRef` already carries its own converter, and handing that
 * typed ref to `collection()` would only mean casting it back to `DocumentData`.
 */
export const getSubDocumentRef = <TModelData extends DocumentData, TFirebaseData extends DocumentData = TModelData>(
  collectionPath: string,
  identifier: string,
  subCollectionPath: string,
  subIdentifier: string,
  converter: FirestoreConverter<TModelData, TFirebaseData>,
) => (
  doc(db, collectionPath, identifier, subCollectionPath, subIdentifier)
    .withConverter(withConverter(converter))
);

/**
 * A whole sub-collection —
 * `getSubCollectionRef('v1_users', uid, 'v1_user_friends', userFriendConverter)`.
 *
 * Same flat-segments contract as `getSubDocumentRef` above, and for the same
 * reason: the parent ref would only have to be cast back.
 */
export const getSubCollectionRef = <TModelData extends DocumentData, TFirebaseData extends DocumentData = TModelData>(
  collectionPath: string,
  identifier: string,
  subCollectionPath: string,
  converter: FirestoreConverter<TModelData, TFirebaseData>,
) => (
  collection(db, collectionPath, identifier, subCollectionPath)
    .withConverter(withConverter(converter))
);

/**
 * A `getDoc` for a document that **cannot change once it exists** — served from
 * the SDK's own disk cache when it holds it, from the server otherwise.
 *
 * React Native Firebase runs the native SDKs, whose offline persistence is on
 * by default and durable across launches — unlike the web SDK's memory-only
 * cache on React Native, which `docs/firebase-read-optimization.md` was written
 * against. That does **not** on its own make a read free: `getDoc` goes out on
 * `Source.DEFAULT`, meaning server first and cache only as an offline fallback,
 * so it is billed every time. `Source.CACHE` is what actually spends nothing —
 * and it is only ever correct on a document whose content is frozen.
 *
 * Two rules make that safe here, and both are load-bearing:
 *
 * - **A cache miss falls back to the server.** The native SDKs reject a
 *   `source: 'cache'` read the cache cannot answer — the normal case on a fresh
 *   install, and the reason a hit is an optimisation rather than a guarantee: a
 *   document no listener holds open is eligible for the cache's LRU eviction.
 *   Nothing here breaks when it is evicted; the read simply costs what it used
 *   to.
 * - **A cached *absence* is never trusted.** `exists() === false` is the one
 *   answer a frozen document can give today and contradict tomorrow — a friend
 *   who had not answered yet, a day not drawn when the month was last read — so
 *   it is re-read rather than believed. Only a document the cache actually
 *   holds short-circuits the round trip.
 *
 * Which leaves the caller with one thing to establish: that the document, once
 * written, is never rewritten. `v1_daily_question_months` for a **past** month
 * (the current one gains a day at every 07:00 draw) and a `v1_daily_question_answers`
 * entry (the rules deny every update to one) are the two that qualify.
 *
 * This is not a replacement for the module stores — `calendarCache`,
 * `useFriendAvatars` — which dedupe the reads of one app run whether or not
 * anything is frozen. It is the layer under them, and it survives a relaunch.
 */
export const getFrozenDoc = async <TModelData extends DocumentData, TFirebaseData extends DocumentData>(
  reference: DocumentReference<TModelData, TFirebaseData>,
): Promise<DocumentSnapshot<TModelData, TFirebaseData>> => {
  const cached = await getDocFromCache(reference).catch(() => null);

  return cached !== null && cached.exists() ? cached : await getDoc(reference);
};
