import {
  type DocumentData,
  type FirestoreDataConverter,
  GeoPoint,
  Timestamp,
  collection,
  doc,
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
