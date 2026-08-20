import { useState } from 'react';

import { useAuth } from '@/auth/AuthContext';

/** `acceptFriendship` / `removeFriendship` — both take the pair, in that order. */
export type FriendshipWrite = (userId: string, friendId: string) => Promise<void>;

export interface FriendshipWriter {
  /** The friend whose row is currently being written, or null. */
  busy: string | null;
  /** Which write that is — a row showing two buttons only spins the one that was tapped. */
  running: FriendshipWrite | null;
  /** True once a write has failed, until the next one starts. */
  failed: boolean;
  run: (friendId: string, write: FriendshipWrite) => Promise<void>;
}

/**
 * Writing one half of the pair from a friend row, wherever that row is shown.
 *
 * The list is a subscription, so nothing is applied optimistically: the row is
 * held busy until the write lands and the snapshot says what happened.
 */
export const useFriendshipWrite = (): FriendshipWriter => {
  const { user } = useAuth();
  const [ pending, setPending ] = useState<{ friendId: string; write: FriendshipWrite } | null>(null);
  const [ failed, setFailed ] = useState(false);

  const run = async (friendId: string, write: FriendshipWrite) => {
    if (user === null) {
      return;
    }

    setPending({ friendId, write });
    setFailed(false);

    try {
      await write(user.uid, friendId);
    } catch (error: unknown) {
      console.warn('[friends] could not write the friendship', friendId, error);
      setFailed(true);
    } finally {
      setPending(null);
    }
  };

  return { busy: pending?.friendId ?? null, running: pending?.write ?? null, failed, run };
};
