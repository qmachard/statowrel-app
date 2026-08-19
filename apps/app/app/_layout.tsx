import '../global.css';

import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { SpaceGrotesk_400Regular } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ArchivoBlack_400Regular,
    SpaceGrotesk_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // The navigator is mounted on the very first render, even while the fonts
  // are still loading. Gating it behind `fontsLoaded` (returning null) leaves
  // expo-router's NavigationContainer without a navigator for the first
  // frames, and whatever touches the router in that window — the initial
  // route, a deep link — throws "Couldn't find a navigation context".
  // The splash screen, held above, is what hides the unstyled frames.
  //
  // No SafeAreaProvider here either: expo-router's ExpoRoot already renders
  // one around the root layout. A nested provider renders `null` until the
  // native insets round-trip completes, which delays the navigator the same
  // way — invisible on web, where the outer provider gets initial metrics.
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
