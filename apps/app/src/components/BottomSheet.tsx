import type { ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { shadows } from '@/design/shadows';
import { useSheetBottomInset } from '@/lib/useSheetBottomInset';
import { borderWidth, colors, radius, spacing } from '@/design/tokens';

export interface BottomSheetProps {
  visible: boolean;
  /** What the sheet is for, announced to screen readers. */
  label: string;
  children: ReactNode;
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    // The app stays visible under the sheet, dimmed rather than hidden.
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    flex: 1,
    marginTop: spacing(20),
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
});

/**
 * A sheet that climbs from the bottom of the screen over a scrim, nearly full
 * height, top corners rounded, thick top border and the hard shadow cast
 * upwards (`shadows.up`).
 *
 * Blocking is the whole point — no grabber, no backdrop to tap, and Android's
 * back button swallowed by `onRequestClose`. A sheet is open because something
 * has to be settled before the app underneath means anything.
 *
 * That is also why it is a `Modal` and not a `presentation: 'formSheet'` route
 * like `DailyQuestion`, the app's other sheet: a form sheet is dismissable by
 * design, and it is navigation that opens it. This one is opened by state —
 * nothing ever pushes or pops it, it is up exactly while its condition holds.
 */
export const BottomSheet = ({ visible, label, children }: BottomSheetProps) => {
  // The sheet ends flush against the bottom of the screen, and its last row —
  // the way out of the onboarding sheet — sits right on it.
  const bottomInset = useSheetBottomInset();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      <View style={styles.scrim}>
        <View
          accessibilityViewIsModal
          accessibilityLabel={label}
          style={[ styles.sheet, shadows.up, { paddingBottom: bottomInset } ]}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
};
