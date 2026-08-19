import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

/**
 * Navigate from outside the React tree (deep-link handlers, notifications).
 * Screens use `useNavigation()` instead.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
