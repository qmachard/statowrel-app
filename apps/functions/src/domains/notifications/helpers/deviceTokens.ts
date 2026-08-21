import type { DocumentReference, QuerySnapshot } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

import {
  type DevicePlatform,
  USER_COLLECTION,
  USER_DEVICE_COLLECTION,
  type UserDeviceData,
  isExpoPushToken,
  userConverter,
  userDeviceConverter,
} from '@statowrel/models';

import {
  createWriteBatch,
  getCollectionGroupRef,
  getDocumentRef,
  getSubCollectionRef,
} from '@/libs/firebase-admin';

/** A write batch takes at most 500 operations. */
const DELETES_PER_BATCH = 500;

export interface RegisteredDevice {
  /** Firebase Auth UID the device is registered under — what a per-user fan-out groups on. */
  user_id: string;
  push_token: string;
  platform: DevicePlatform;
  /** Where the token is stored, so a dead one can be dropped without rebuilding its path. */
  ref: DocumentReference<UserDeviceData>;
}

/**
 * The devices a query answered with, whichever query it was.
 *
 * Malformed tokens are dropped here rather than sent: Expo rejects a whole
 * request over one bad `to`, which would cost the hundred people sharing that
 * batch their notification.
 */
const readDevices = (snapshot: QuerySnapshot<UserDeviceData>): RegisteredDevice[] => {
  const devices = snapshot.docs.reduce<RegisteredDevice[]>((registered, document) => {
    const data = document.data();
    // The document id is the token; the field is its copy. Reading the id keeps
    // this working for a document whose field was never written.
    const pushToken = document.id;

    if (isExpoPushToken(pushToken)) {
      // The parent's parent is `v1_users/{uid}`, which is the owner even for a
      // document whose `user_id` field was never written.
      const userId = document.ref.parent.parent?.id ?? data.user_id;

      registered.push({ user_id: userId, push_token: pushToken, platform: data.platform, ref: document.ref });
    }

    return registered;
  }, []);

  if (devices.length !== snapshot.size) {
    logger.warn('Skipped device documents that do not carry an Expo push token', {
      skipped: snapshot.size - devices.length,
    });
  }

  return devices;
};

/**
 * Every push destination in the database, read as a collection group — the
 * daily question goes to everyone at once (docs/prd.md §4.2), so there is
 * nothing to filter by.
 *
 * Read whole by the per-user fan-out of 18:00 too (docs/prd.md §4.5): a
 * Firestore `in` filter takes at most thirty values, so targeting a few hundred
 * users would be a dozen queries against this one read. The caller groups on
 * `user_id`.
 *
 * The whole set is held in memory. That is the same bet `drawApprovedQuestion`
 * makes on the question pot, and it holds for as long as one device fits in a
 * few hundred bytes; a paginated fan-out is what a six-figure user count would
 * need.
 */
export const listRegisteredDevices = async (): Promise<RegisteredDevice[]> => (
  readDevices(await getCollectionGroupRef(USER_DEVICE_COLLECTION, userDeviceConverter).get())
);

/**
 * The push destinations of **one** account — what a notification addressed to
 * somebody in particular goes to, a received friend invitation first
 * (docs/prd.md §4.1).
 *
 * A sub-collection read rather than the collection group filtered on
 * `user_id`: the tokens of one user are already a path, so this costs the
 * documents it returns and needs no index at all.
 */
export const listUserDevices = async (userId: string): Promise<RegisteredDevice[]> => (
  readDevices(await getSubCollectionRef(
    getDocumentRef(USER_COLLECTION, userId, userConverter),
    USER_DEVICE_COLLECTION,
    userDeviceConverter,
  ).get())
);

/**
 * Drops the tokens Expo says nobody holds any more. Deleting is the whole
 * clean-up: the app writes the document again at the next registration, under
 * whichever account is signed in then.
 */
export const deleteDevices = async (refs: DocumentReference<UserDeviceData>[]): Promise<void> => {
  for (let index = 0; index < refs.length; index += DELETES_PER_BATCH) {
    const batch = createWriteBatch();

    for (const ref of refs.slice(index, index + DELETES_PER_BATCH)) {
      batch.delete(ref);
    }

    await batch.commit();
  }
};
