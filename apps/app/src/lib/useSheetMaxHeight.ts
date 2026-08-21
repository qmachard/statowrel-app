import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/design/tokens';

/**
 * The peek of the screen a form sheet leaves above itself, under the status
 * bar — what the system keeps whatever detent the sheet settles on.
 */
const SHEET_TOP_GAP = spacing(6);

/**
 * The tallest a sheet's content may measure before it has to scroll.
 *
 * A `fitToContents` detent measures the content it is given and keeps the
 * height it measured — the system then caps that height at the screen, and
 * whatever the content had past the cap is simply cut off. So the cap has to
 * exist on this side too: bound the content by this height, let it scroll past
 * it, and a short question still gets a short sheet.
 *
 * Read from the root `SafeAreaProvider` like `useSheetBottomInset`, and known
 * at the first render for the same reason — what gets measured already carries
 * it.
 */
export const useSheetMaxHeight = () => {
  const { height } = useWindowDimensions();
  const { top } = useSafeAreaInsets();

  return height - top - SHEET_TOP_GAP;
};
