import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { OnboardingSheet } from '@/auth/OnboardingSheet';
import { useDemoAnswerFlush } from '@/onboarding/data/useDemoAnswerFlush';
import { useOnboardingSeen } from '@/onboarding/data/useOnboardingSeen';
import { OnboardingCarousel } from '@/onboarding/screens/OnboardingCarousel';
import { RootNavigator } from '@/navigation/RootNavigator';
import { linking } from '@/navigation/linking';
import { navigationRef } from '@/navigation/navigationRef';
import { navigationTheme } from '@/navigation/theme';
import { usePushNotifications } from '@/notifications/data/usePushNotifications';
import { usePushPermissionNudge } from '@/notifications/data/usePushPermissionNudge';

SplashScreen.preventAutoHideAsync();

/**
 * How long the splash screen may wait on the session and the carousel flag
 * before the app opens anyway. The gate below exists to spare a signed-in user
 * a flash of the sign-in screen — but its slowest link is the first Firestore
 * snapshot of the profile, and on some Android devices that snapshot can hang
 * outright (invertase/react-native-firebase#8787). Past this point, a stuck
 * splash is worse than a screen still loading its data.
 */
const SPLASH_TIMEOUT_MS = 6000;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const SessionGate = () => {
  const { user, initializing } = useAuth();
  const { resolved, seen, markSeen } = useOnboardingSeen();
  const [ timedOut, setTimedOut ] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), SPLASH_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, []);

  // Hold the splash screen until the persisted session is restored *and* the
  // carousel flag has been read, so the app never flashes the sign-in screen at
  // an already-signed-in user, nor at one about to be shown the carousel — but
  // never past the timeout: opening on a screen whose data is still loading
  // beats a splash that hangs with it.
  const ready = (!initializing && resolved) || timedOut;

  // Inside the provider and inside the container, which is what it needs: the
  // session tells it whose device to register, and a tapped notification has a
  // navigator to open the day on.
  usePushNotifications();
  // The catch-up for a session that was already signed in when the carousel's
  // notification slide shipped: it never asked them, and nothing else did.
  usePushPermissionNudge();
  // The other half of the onboarding demo: the pick made before there was an
  // account, written once there is one.
  useDemoAnswerFlush();

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  // Both of these live beside the navigator rather than in it: they are driven
  // by state — the session for the username sheet, this install's own history
  // for the carousel — not by a route, and each has to be able to cover any
  // screen. The carousel comes last because it covers the app whole.
  return (
    <>
      <RootNavigator />
      <OnboardingSheet />
      {user === null && !seen ? <OnboardingCarousel onDone={markSeen} /> : null}
    </>
  );
};

export default function App() {
  const [ fontsLoaded ] = useFonts({
    ArchivoBlack_400Regular,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <NavigationContainer ref={navigationRef} theme={navigationTheme} linking={linking}>
          <StatusBar style="auto" />
          <AuthProvider>
            <SessionGate />
          </AuthProvider>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
