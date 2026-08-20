import type { DocumentReference } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

import {
  type DevicePlatform,
  USER_DEVICE_COLLECTION,
  type UserDeviceData,
  isExpoPushToken,
  userDeviceConverter,
} from '@statowrel/models';

import { createWriteBatch, getCollectionGroupRef } from '@/libs/firebase-admin';

/** A write batch takes at most 500 operations. */
const DELETES_PER_BATCH = 500;

export interface RegisteredDevice {
  push_token: string;
  platform: DevicePlatform;
  /** Where the token is stored, so a dead one can be dropped without rebuilding its path. */
  ref: DocumentReference<UserDeviceData>;
}

/**
 * Every push destination in the database, read as a collection group — the
 * daily question goes to everyone at once (docs/prd.md §4.2), so there is
 * nothing to filter by.
 *
 * Malformed tokens are dropped here rather than sent: Expo rejects a whole
 * request over one bad `to`, which would cost the hundred people sharing that
 * batch their notification.
 *
 * The whole set is held in memory. That is the same bet `drawApprovedQuestion`
 * makes on the question pot, and it holds for as long as one device fits in a
 * few hundred bytes; a paginated fan-out is what a six-figure user count would
 * need.
 */
export const listRegisteredDevices = async (): Promise<RegisteredDevice[]> => {
  const snapshot = await getCollectionGroupRef(USER_DEVICE_COLLECTION, userDeviceConverter).get();

  const devices = snapshot.docs.reduce<RegisteredDevice[]>((registered, document) => {
    const data = document.data();
    // The document id is the token; the field is its copy. Reading the id keeps
    // this working for a document whose field was never written.
    const pushToken = document.id;

    if (isExpoPushToken(pushToken)) {
      registered.push({ push_token: pushToken, platform: data.platform, ref: document.ref });
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
