import { Bell, BellOff, BellRing } from '@/components/icons';

import { Button } from '@/components/Button';
import { openNotificationSettings } from '@/notifications/data/pushPermission';
import { usePushPermission } from '@/notifications/data/usePushPermission';

/**
 * The permanent way in and out of the notifications, in the Menu's settings
 * block (docs/prd.md §5.3) — what the app owed anybody who was not shown the
 * onboarding carousel's slide, or who answered « non » to it.
 *
 * One button, three shapes, and the state decides which:
 *
 * - never asked → « Activer les notifications », which raises the system dialog
 *   right there;
 * - refused or turned off → « Ouvrir les réglages », since the dialog is spent
 *   and the switch only exists in the system settings;
 * - granted → the same door, said the other way round, so turning them back off
 *   is one tap from here rather than a hunt through the phone's settings.
 *
 * It renders nothing at all while the permission is being read, and on anything
 * that cannot carry a notification — a simulator, a build without the native
 * module: a dead button in the settings would be worse than no button.
 */
export const NotificationsButton = () => {
  const { state, busy, enable } = usePushPermission();

  if (state === null || state === 'unavailable') {
    return null;
  }

  if (state === 'granted') {
    return (
      <Button
        label="Notifications activées"
        description="Les régler depuis ton téléphone"
        variant="ghost"
        icon={BellRing}
        onPress={() => { void openNotificationSettings(); }}
      />
    );
  }

  return (
    <Button
      label={state === 'blocked' ? 'Ouvrir les réglages' : 'Activer les notifications'}
      description={state === 'blocked'
        ? 'Les notifications sont bloquées pour StatOwrel'
        : 'La question du jour, à 7h00'}
      variant="secondary"
      icon={state === 'blocked' ? BellOff : Bell}
      loading={busy}
      onPress={enable}
    />
  );
};
