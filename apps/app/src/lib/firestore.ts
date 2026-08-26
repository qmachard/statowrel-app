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
) => (
  converter(
    Timestamp as unknown as Parameters<typeof converter>[0],
    GeoPoint as unknown as Parameters<typeof converter>[1],
  ) as unknown as FirestoreDataConverter<TModelData, TFirebaseData>
);

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
