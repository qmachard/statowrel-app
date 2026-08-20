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
 * The day it grows a function of its own — a reminder before midnight, a
 * friend accepting an invitation — it lands here, next to the helpers, and
 * this file starts exporting it.
 */
export {
  type PushDeliveryReport,
  type PushNotification,
  sendPushToAllDevices,
} from './helpers/sendPush';
