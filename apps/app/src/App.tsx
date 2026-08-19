import './global.css';

import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { SpaceGrotesk_400Regular } from '@expo-google-fonts/space-grotesk';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { RootNavigator } from '@/navigation/RootNavigator';
import { linking } from '@/navigation/linking';
import { navigationRef } from '@/navigation/navigationRef';
import { navigationTheme } from '@/navigation/theme';

SplashScreen.preventAutoHideAsync();

const SessionGate = () => {
  const { initializing } = useAuth();

  useEffect(() => {
    if (!initializing) {
      SplashScreen.hideAsync();
    }
  }, [initializing]);

  // Hold the splash screen until the persisted session is restored, so the app
  // never flashes the sign-in screen at an already-signed-in user.
  if (initializing) {
    return null;
  }

  return <RootNavigator />;
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
      <GestureHandlerRootView className="flex-1">
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
