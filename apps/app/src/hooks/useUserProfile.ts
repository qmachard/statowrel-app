import { USER_COLLECTION, type UserData, userConverter } from '@statowrel/models';
import { Timestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getDocumentRef } from '@/lib/firestore';

interface UserProfileState {
  profile: UserData | null;
  loading: boolean;
  updateDisplayName: (displayName: string) => Promise<void>;
  updatePhotoUrl: (photoUrl: string | null) => Promise<void>;
}

/** Last snapshot received, tagged with the uid it belongs to. */
interface ProfileSnapshot {
  uid: string | null;
  profile: UserData | null;
}

/**
 * Live `v1_users/{uid}` profile plus its two write paths.
 *
 * `useAuth().profile` is the snapshot taken when the session opened — this hook
 * is the subscribed view the profile screen edits against, so a pseudo or an
 * avatar change shows up without waiting for the next sign-in.
 *
 * Both writes go through `updateDoc`, which does not run the converter's
 * `toFirestore` — hence the explicit `Timestamp.now()` for `updated_at`.
 */
export const useUserProfile = (uid: string | null): UserProfileState => {
  // The snapshot carries its uid so switching accounts reads as "loading"
  // during render, instead of needing an effect to reset the state.
  const [ snapshot, setSnapshot ] = useState<ProfileSnapshot>({ uid: null, profile: null });

  const ref = useMemo(
    () => (uid ? getDocumentRef(USER_COLLECTION, uid, userConverter) : null),
    [uid],
  );

  useEffect(() => {
    if (!ref || !uid) return;

    return onSnapshot(ref, (document) => setSnapshot({ uid, profile: document.data() ?? null }));
  }, [ ref, uid ]);

  const updateDisplayName = useCallback(async (displayName: string) => {
    if (!ref) return;

    await updateDoc(ref, { display_name: displayName, updated_at: Timestamp.now() });
  }, [ref]);

  const updatePhotoUrl = useCallback(async (photoUrl: string | null) => {
    if (!ref) return;

    await updateDoc(ref, { photo_url: photoUrl, updated_at: Timestamp.now() });
  }, [ref]);

  const isFresh = uid !== null && snapshot.uid === uid;

  return {
    profile: isFresh ? snapshot.profile : null,
    loading: uid !== null && !isFresh,
    updateDisplayName,
    updatePhotoUrl,
  };
};
