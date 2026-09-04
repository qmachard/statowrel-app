import { REFERRAL_STATFLOUZZ_REWARD } from '@statowrel/models';
import { Share } from 'react-native';

import { track } from '@/analytics/analytics';
import { shareMessage } from '@/referrals/copy';

/**
 * Hands the invitation to the phone's own share sheet — docs/prd.md §4.9.
 *
 * React Native's built-in `Share`, not `expo-sharing`: the built-in one shares
 * *text*, which is what an invitation is, while `expo-sharing` shares a file
 * and would be a dependency and a native rebuild for something already there.
 *
 * A dismissed sheet is not a failure and is not tracked — `share_action` comes
 * back `dismissedAction` when the user backs out, and counting that as a share
 * would make the funnel report an invitation nobody ever received. On iOS the
 * action is `sharedAction` with the target app; on Android it is always
 * `sharedAction`, the platform not telling us more, which is fine: the event
 * only claims the sheet was gone through.
 */
export const shareInvite = async (username: string): Promise<void> => {
  const result = await Share.share({ message: shareMessage(username, REFERRAL_STATFLOUZZ_REWARD) });

  if (result.action === Share.sharedAction) {
    track({ name: 'invite_link_shared' });
  }
};
