import type { UserFriendData } from '@statowrel/models';
import { Check, X } from 'lucide-react-native';

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
 */
export const PendingActions = ({ friendship, incoming, busy, running, run }: PendingActionsProps) => (
  <>
    {incoming ? (
      <Button
        label={ACTIONS.accept}
        icon={Check}
        size="sm"
        loading={busy && running === acceptFriendship}
        disabled={busy}
        onPress={() => run(friendship.friend_id, acceptFriendship)}
      />
    ) : null}

    <Button
      label={incoming ? ACTIONS.refuse : ACTIONS.cancel}
      icon={X}
      variant="outline"
      size="sm"
      loading={busy && running === removeFriendship}
      disabled={busy}
      onPress={() => run(friendship.friend_id, removeFriendship)}
    />
  </>
);
