import type { UserFriendData } from '@statowrel/models';

import { Button } from '@/components/Button';
import { ACTIONS } from '@/friends/copy';
import { acceptFriendship, removeFriendship } from '@/friends/data/friendships';
import type { FriendshipWrite } from '@/friends/data/useFriendshipWrite';

export interface PendingActionsProps {
  friendship: UserFriendData;
  /** True for an invitation received — the only one that can be accepted. */
  incoming: boolean;
  /** True while this row's own write is in flight. */
  busy: boolean;
  /** The write currently in flight, so only the button that was tapped spins. */
  running: FriendshipWrite | null;
  run: (friendId: string, write: FriendshipWrite) => Promise<void>;
}

/**
 * What a pending invitation offers, as buttons rather than as a menu: an
 * invitation is the one line in the app waiting on an answer, so both answers
 * are on the row — the menu is left to the friendships that have nothing
 * pressing to say.
 *
 * Two words, no icons, on the smallest step of the scale: the pair has to fit
 * beside an avatar inside a card that scrolls, and a label spilling out of its
 * own border is the one thing this design cannot absorb.
 */
export const PendingActions = ({ friendship, incoming, busy, running, run }: PendingActionsProps) => (
  <>
    {incoming ? (
      <Button
        label={ACTIONS.accept}
        size="xs"
        loading={busy && running === acceptFriendship}
        disabled={busy}
        onPress={() => run(friendship.friend_id, acceptFriendship)}
      />
    ) : null}

    <Button
      label={incoming ? ACTIONS.refuse : ACTIONS.cancel}
      variant="outline"
      size="xs"
      loading={busy && running === removeFriendship}
      disabled={busy}
      onPress={() => run(friendship.friend_id, removeFriendship)}
    />
  </>
);
