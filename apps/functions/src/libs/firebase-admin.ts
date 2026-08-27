import { type App, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import {
  type BulkWriter,
  type DocumentData,
  getFirestore,
  type FirestoreDataConverter,
  Timestamp,
  type DocumentSnapshot,
  type DocumentReference,
  type QueryDocumentSnapshot,
  type Transaction,
  GeoPoint,
} from 'firebase-admin/firestore';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import { ulid } from 'ulid';

import { type FirestoreConverter, Identifiable, type UniversalSnapshot } from '@statowrel/models';

/**
 * The deployed runtime and the emulator both publish the project id and
 * Application Default Credentials through the environment, so there is nothing
 * to hand `initializeApp()` — and no service-account key to carry around.
 *
 * The one thing default credentials cannot do is sign a Storage URL locally:
 * `getAdminStorageSignedUrl` needs the runtime service account to hold
 * `iam.serviceAccountTokenCreator` on itself. Grant that role when a signed URL
 * is first needed, rather than shipping a private key to avoid it.
 */
export const initFirebase = (): App => {
  const apps = getApps();

  if (apps.length > 0) {
    return apps[0] as App;
  }

  return initializeApp();
};

export const getAuth = () => {
  const app = initFirebase();

  return getAdminAuth(app);
};

export const getStorage = () => {
  const app = initFirebase();

  return getAdminStorage(app);
};

export const getAdminStorageSignedUrl = async (path: string, filename?: string) => {
  const app = initFirebase();

  const [ url ] = await getAdminStorage(app).bucket().file(path).getSignedUrl({
    action: 'read',
    expires: Date.now() + 1000 * 60 * 60,
    ...(filename ? { responseDisposition: `attachment; filename="${filename}"` } : {}),
  });

  return url;
};

/**
 * Runs `updateFunction` inside a Firestore transaction — reads first, writes
 * after, retried by the SDK on contention.
 *
 * A batch commits blindly; a transaction is what a trigger needs when the write
 * depends on what is already there. Firestore triggers are delivered *at least*
 * once, so anything that increments a counter has to read a marker and bail out
 * before writing, atomically.
 */
export const runTransaction = <T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T> => {
  const app = initFirebase();

  return getFirestore(app).runTransaction(updateFunction);
};

export const createWriteBatch = () => {
  const app = initFirebase();

  return getFirestore(app).batch();
};

/**
 * A `BulkWriter` — many independent writes, committed as fast as the backend
 * takes them.
 *
 * What a batch is not: a batch is atomic, which buys nothing when the writes
 * have nothing to do with one another, and costs a 500-write ceiling plus an
 * all-or-nothing failure. A `BulkWriter` has neither — it retries each write on
 * its own when the document it lands on is contended, which is exactly the
 * shape of a fan-out onto documents other writers are also touching.
 *
 * The caller owns the flush: `close()` (or `flush()`) is what waits for the
 * writes to land, and a caller that returns without awaiting it loses them.
 */
export const createBulkWriter = (): BulkWriter => {
  const app = initFirebase();

  return getFirestore(app).bulkWriter();
};

export const getDocumentRef = <TModelData extends DocumentData, TFirebaseData extends DocumentData = TModelData>(collection: string, identifier: string, converter: FirestoreConverter<TModelData, TFirebaseData>): DocumentReference<TModelData, TFirebaseData> => {
  const app = initFirebase();

  return getFirestore(app)
    .collection(collection)
    .doc(identifier)
    .withConverter(converter(Timestamp, GeoPoint) as unknown as FirestoreDataConverter<TModelData, TFirebaseData>);
};
export const createDocumentRef = <TModelData extends DocumentData, TFirebaseData extends DocumentData = TModelData>(collection: string, converter: FirestoreConverter<TModelData, TFirebaseData>) => {
  const app = initFirebase();

  return getFirestore(app).collection(collection).doc(ulid()).withConverter(converter(Timestamp, GeoPoint) as unknown as FirestoreDataConverter<TModelData, TFirebaseData>);
};
export const getCollectionRef = <TModelData extends DocumentData, TFirebaseData extends DocumentData = TModelData>(identifier: string, converter: FirestoreConverter<TModelData, TFirebaseData>) => {
  const app = initFirebase();

  return getFirestore(app).collection(identifier).withConverter(converter(Timestamp, GeoPoint) as unknown as FirestoreDataConverter<TModelData, TFirebaseData>);
};
export const getSubCollectionRef = <TModelData extends DocumentData, TFirebaseData extends DocumentData = TModelData>(parentRef: FirebaseFirestore.DocumentReference<DocumentData>, collection: string, converter: FirestoreConverter<TModelData, TFirebaseData>) => {
  return parentRef.collection(collection).withConverter(converter(Timestamp, GeoPoint) as unknown as FirestoreDataConverter<TModelData, TFirebaseData>);
};
export const getCollectionGroupRef = <TModelData extends DocumentData, TFirebaseData extends DocumentData = TModelData>(collection: string, converter: FirestoreConverter<TModelData, TFirebaseData>) => {
  const app = initFirebase();

  return getFirestore(app).collectionGroup(collection).withConverter(converter(Timestamp, GeoPoint) as unknown as FirestoreDataConverter<TModelData, TFirebaseData>);
};
export const getSubDocumentRef = <TModelData extends DocumentData, TFirebaseData extends DocumentData = TModelData>(parentRef: FirebaseFirestore.DocumentReference<DocumentData>, collection: string, identifier: string, converter: FirestoreConverter<TModelData, TFirebaseData>): DocumentReference<TModelData, TFirebaseData> => {
  return parentRef.collection(collection).doc(identifier).withConverter(converter(Timestamp, GeoPoint) as unknown as FirestoreDataConverter<TModelData, TFirebaseData>);
};
export const createSubDocumentRef = <TModelData extends DocumentData, TFirebaseData extends DocumentData = TModelData>(parentRef: FirebaseFirestore.DocumentReference<DocumentData>, collection: string, converter: FirestoreConverter<TModelData, TFirebaseData>) => {
  return parentRef.collection(collection).doc(ulid()).withConverter(converter(Timestamp, GeoPoint) as unknown as FirestoreDataConverter<TModelData, TFirebaseData>);
};

export const getDocumentUpsertRef = async <TModelData extends DocumentData, TFirebaseData extends DocumentData = TModelData>(collectionPath: string, search: Partial<Record<keyof TFirebaseData | string, string | string[]>>, converter: FirestoreConverter<TModelData, TFirebaseData>): Promise<[ FirebaseFirestore.DocumentReference<TModelData, TFirebaseData>, boolean ]> => {
  let query: FirebaseFirestore.Query<TModelData, TFirebaseData> = getCollectionRef(collectionPath, converter);

  for (const [ key, value ] of Object.entries(search)) {
    query = Array.isArray(value) ? query.where(key, 'in', value) : query.where(key, '==', value);
  }

  const snapshot = await query.get();

  if (snapshot.empty) {
    return [ createDocumentRef(collectionPath, converter), false ];
  }

  return [ snapshot.docs[0].ref, true ];
};

/**
 * Reads a trigger's event snapshot through a model converter.
 *
 * Firestore triggers hand over a raw snapshot — no `withConverter` on it — so
 * this is the only way to keep the "never touch `snap.data()` untyped" rule on
 * the trigger side. The cast is the same one every ref helper above makes: our
 * converters are typed against `UniversalSnapshot`, which spans both SDKs.
 */
export const parseSnapshotData = <TModelData extends DocumentData, TFirebaseData extends DocumentData = TModelData>(
  snapshot: QueryDocumentSnapshot,
  converter: FirestoreConverter<TModelData, TFirebaseData>,
): TModelData => (
  converter(Timestamp, GeoPoint).fromFirestore(snapshot as unknown as UniversalSnapshot<Partial<TFirebaseData>>)
);

export const parseData = <TModelData>(document: DocumentSnapshot<TModelData>): Identifiable<TModelData> | null => {
  if (!document.exists) {
    return null;
  }

  return ({
    id: document.id,
    ...document.data() as TModelData,
  });
};

export function isDefined<T>(value: T | null | undefined): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export const REGION_CLOUD = 'europe-west1';
