import {
  type DocumentData,
  type FirestoreDataConverter,
  GeoPoint,
  Timestamp,
  collection,
  doc,
} from 'firebase/firestore';

import type { FirestoreConverter } from '@statowrel/models';

import { db } from './firebase';

/**
 * Client-side counterpart of `apps/functions/src/libs/firebase-admin.ts`: every
 * ref is built with a `@statowrel/models` converter, so nothing in the app ever
 * reads `snap.data()` untyped.
 *
 * The cast is the same one the admin helpers make — our converters are typed
 * against `UniversalSnapshot`, which spans both SDKs and is therefore not
 * assignable to the client SDK's own `FirestoreDataConverter` signature.
 */
const withConverter = <TModelData extends DocumentData, TFirebaseData extends DocumentData = TModelData>(
  converter: FirestoreConverter<TModelData, TFirebaseData>,
) => converter(Timestamp, GeoPoint) as unknown as FirestoreDataConverter<TModelData, TFirebaseData>;

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
 * `getSubDocumentRef('v1_daily_questions', date, 'v1_daily_question_answers', uid, converter)`.
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
