import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { SpaceGrotesk_400Regular } from '@expo-google-fonts/space-grotesk';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { OnboardingSheet } from '@/auth/OnboardingSheet';
import { RootNavigator } from '@/navigation/RootNavigator';
import { linking } from '@/navigation/linking';
import { navigationRef } from '@/navigation/navigationRef';
import { navigationTheme } from '@/navigation/theme';
import { Splash } from '@/splash/Splash';

SplashScreen.preventAutoHideAsync();

// The native splash goes out on a fade rather than a cut, so what is underneath
// it — the animated splash, on the same background colour — is never revealed
// by a hard edge.
SplashScreen.setOptions({ duration: 200, fade: true });

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const SessionGate = () => {
  const { initializing } = useAuth();
  const [ splashVisible, setSplashVisible ] = useState(true);

  const handleSplashHidden = useCallback(() => setSplashVisible(false), []);

  // The splash covers the app until the persisted session is restored, so the
  // app never flashes the sign-in screen at an already-signed-in user — and it
  // covers the navigator rather than replacing it, which lets the first screen
  // mount and load its data while the star is still running.
  return (
    <>
      {initializing ? null : (
        // The sheet lives beside the navigator rather than in it: it is driven
        // by the session, not by a route, and it has to be able to cover any
        // screen.
        <>
          <RootNavigator />
          <OnboardingSheet />
        </>
      )}

      {splashVisible ? <Splash ready={!initializing} onHidden={handleSplashHidden} /> : null}
    </>
  );
};

export default function App() {
  const [ fontsLoaded ] = useFonts({
    ArchivoBlack_400Regular,
    SpaceGrotesk_400Regular,
  });

  // Hand the native splash over to the animated one only once the tree has
  // actually been laid out — hiding it a render earlier is what shows a blank
  // frame between the two.
  const handleRootLayout = useCallback(() => {
    SplashScreen.hideAsync();
  }, []);

  // Until the fonts are in, there is nothing to draw that would not have to be
  // drawn again in another typeface: the native splash holds.
  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root} onLayout={handleRootLayout}>
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
