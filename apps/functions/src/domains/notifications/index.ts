/**
 * Notifications — how anything in this backend reaches a phone.
 *
 * The domain registers **no Cloud Function of its own**, which is why it is
 * absent from `src/index.ts`: nothing pushes on its own schedule yet. It is a
 * service the other domains go through, and each of them owns the trigger —
 * `dailyQuestions-notifyDailyQuestion` is the first, a Cloud Task so the
 * fan-out gets its own retries without ever making the scheduler re-draw the
 * day.
 *
 * The day it grows a function of its own — a reminder before midnight — it
 * lands here, next to the helpers, and this file starts exporting it. The
 * friend invitation went the other way, as the rule predicts: the trigger is
 * the `friends` domain's (`onFriendCreated`), the sending is this one's.
 */
export {
  type PushDeliveryReport,
  type PushNotification,
  sendPushToAllDevices,
  sendPushToUser,
} from './helpers/sendPush';
