import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { shadows } from '@/design/shadows';
import { useSheetBottomInset } from '@/lib/useSheetBottomInset';
import { borderWidth, colors, radius, spacing } from '@/design/tokens';

/**
 * The ground the sheet's content sits on. `background` is the app's own cream —
 * a sheet asking for something. `accent` is the red the daily question wears
 * (`src/daily-question/helpers/surface.ts`), so the onboarding demo looks like
 * the question it is imitating.
 *
 * A prop rather than a `style` override, same contract as `Card`: a caller
 * can't half-override a surface.
 */
export type BottomSheetSurface = 'background' | 'accent';

export interface BottomSheetProps {
  visible: boolean;
  /** What the sheet is for, announced to screen readers. */
  label: string;
  surface?: BottomSheetSurface;
  /**
   * Makes the sheet dismissable — the scrim takes a tap and Android's back
   * button closes it. Absent, which is the default, the sheet blocks: see
   * below.
   */
  onDismiss?: () => void;
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
  },
});

const SURFACE = StyleSheet.create({
  background: { backgroundColor: colors.background },
  accent: { backgroundColor: colors.accent },
}) satisfies Record<BottomSheetSurface, ViewStyle>;

/**
 * A sheet that climbs from the bottom of the screen over a scrim, nearly full
 * height, top corners rounded, thick top border and the hard shadow cast
 * upwards (`shadows.up`).
 *
 * Blocking is the default and the reason it exists — no grabber, no backdrop to
 * tap, and Android's back button swallowed by `onRequestClose`. A sheet is open
 * because something has to be settled before the app underneath means anything.
 *
 * `onDismiss` is the one exception, and it is the onboarding demo's
 * (`src/onboarding/`): a question posed to somebody who has not signed up yet
 * settles nothing, so that one has to be closable. Everything else about the
 * sheet stays as it is — it is still opened by state, never pushed.
 *
 * That is also why it is a `Modal` and not a `presentation: 'formSheet'` route
 * like `DailyQuestion`, the app's other sheet: a form sheet is dismissable by
 * design, and it is navigation that opens it. This one is opened by state —
 * nothing ever pushes or pops it, it is up exactly while its condition holds.
 */
export const BottomSheet = ({
  visible,
  label,
  surface = 'background',
  onDismiss,
  children,
}: BottomSheetProps) => {
  // The sheet ends flush against the bottom of the screen, and its last row —
  // the way out of the onboarding sheet — sits right on it.
  const bottomInset = useSheetBottomInset();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onDismiss ?? (() => undefined)}
    >
      <View style={styles.scrim}>
        {/* Absolutely positioned rather than wrapping the sheet: the sheet is
            what the scrim's flex layout places, and a press target around it
            would swallow every tap meant for the content. */}
        {onDismiss === undefined ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            style={StyleSheet.absoluteFill}
            onPress={onDismiss}
          />
        )}

        <View
          accessibilityViewIsModal
          accessibilityLabel={label}
          style={[ styles.sheet, SURFACE[surface], shadows.up, { paddingBottom: bottomInset } ]}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
};
