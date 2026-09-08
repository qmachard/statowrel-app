import AsyncStorage from '@react-native-async-storage/async-storage';

import { isValidUsername } from '@statowrel/models';

const STORAGE_KEY = 'statowrel.referrals.pending-referrer.v1';

/**
 * The sponsor's handle, carried from a tapped link to the sign-up that has not
 * happened yet — docs/prd.md §4.9.
 *
 * The same shape as `src/onboarding/data/demoAnswerStore.ts`, and for the same
 * reason: `referred_by` is only ever accepted on the profile's **create**, so
 * the attribution has exactly one moment to exist, and a link is tapped before
 * that moment. It waits on the phone until the username sheet asks for it.
 *
 * One handle, overwritten rather than queued: somebody who taps two invitations
 * has been invited twice, and the last one is the one they acted on.
 *
 * **There is no deferred attribution to be had.** Firebase Dynamic Links shut
 * down on 25 August 2025, and neither store hands an install anything about the
 * page it came from. So this only closes the loop when the app is *already*
 * installed; the trip through the store is closed by the landing page making
 * the handle legible instead (`apps/admin/public/i/index.html`).
 *
 * Nothing here throws. A handle that cannot be stored is an attribution that
 * gets typed — the field is still on the sheet, which is where it was before
 * any of this.
 */
export const rememberPendingReferrer = async (username: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, username);
  } catch (error: unknown) {
    console.warn('[referrals] could not keep the sponsor’s handle for the sign-up', error);
  }
};

/** The handle waiting to be offered, or `null` — anything unreadable counts as nothing waiting. */
export const readPendingReferrer = async (): Promise<string | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    if (raw === null) {
      return null;
    }

    // Re-checked on the way out as well as on the way in: this value is written
    // by one module but read by the form that fills `referred_by`, and a stored
    // value outlives the version of the app that wrote it.
    return isValidUsername(raw) ? raw : null;
  } catch (error: unknown) {
    console.warn('[referrals] could not read the sponsor’s handle waiting for the sign-up', error);

    return null;
  }
};

export const clearPendingReferrer = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error: unknown) {
    console.warn('[referrals] could not drop the sponsor’s handle once used', error);
  }
};
