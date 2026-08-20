import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The room a sheet has to keep under its content so the system bar doesn't
 * cover it — the navigation bar on Android, the home indicator on iOS.
 *
 * Every sheet in the app ends flush against the bottom of the screen. A
 * `formSheet` route is drawn down to the physical edge on Android, where
 * react-native-screens avoids the top inset and nothing else
 * (`ScreenStackFragment.kt`, « Avoiding top inset by BottomSheet » —
 * https://github.com/software-mansion/react-native-screens/issues/3580), and a
 * `Modal` window goes edge-to-edge there too (`ReactModalHostView` reads
 * `navigationBarTranslucent` as on whenever the edge-to-edge flag is). None of
 * them insets its content on its own.
 *
 * Taken as a number and spent as a plain `paddingBottom`, rather than left to
 * `SafeAreaView edges={['bottom']}`: that component's padding is computed
 * natively and lands *after* the first layout, while a sheet's detent is
 * `fitToContents` — it measures the content it is given and keeps the height it
 * measured. This one is known at the first render, so what gets measured
 * already carries it.
 *
 * The value is the same one `SafeAreaView` would have used: both read the
 * insets of the root `SafeAreaProvider`, never those of the sheet itself
 * (`RNCSafeAreaView.m`, `SafeAreaView.kt` — each resolves its nearest provider
 * and takes that view's insets).
 */
export const useSheetBottomInset = () => useSafeAreaInsets().bottom;
