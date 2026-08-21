import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { SpaceGrotesk_400Regular } from '@expo-google-fonts/space-grotesk';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { OnboardingSheet } from '@/auth/OnboardingSheet';
import { useOnboardingSeen } from '@/onboarding/data/useOnboardingSeen';
import { OnboardingCarousel } from '@/onboarding/screens/OnboardingCarousel';
import { RootNavigator } from '@/navigation/RootNavigator';
import { linking } from '@/navigation/linking';
import { navigationRef } from '@/navigation/navigationRef';
import { navigationTheme } from '@/navigation/theme';
import { usePushNotifications } from '@/notifications/data/usePushNotifications';

SplashScreen.preventAutoHideAsync();

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const SessionGate = () => {
  const { user, initializing } = useAuth();
  const { resolved, seen, markSeen } = useOnboardingSeen();

  // Hold the splash screen until the persisted session is restored *and* the
  // carousel flag has been read, so the app never flashes the sign-in screen at
  // an already-signed-in user, nor at one about to be shown the carousel.
  const ready = !initializing && resolved;

  // Inside the provider and inside the container, which is what it needs: the
  // session tells it whose device to register, and a tapped notification has a
  // navigator to open the day on.
  usePushNotifications();

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
