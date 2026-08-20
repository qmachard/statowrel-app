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
 * Same shape as `apps/app/src/lib/firestore.ts`: every ref is built with a
 * `@statowrel/models` converter, so nothing here ever reads `snap.data()`
 * untyped.
 *
 * The cast is the one the app makes too — our converters are typed against
 * `UniversalSnapshot`, which spans both SDKs and is therefore not assignable to
 * the client SDK's own `FirestoreDataConverter` signature.
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
