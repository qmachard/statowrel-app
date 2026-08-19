import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthContext';

export default function AuthLayout() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return null;
  }

  // Any signed-in account leaves the auth group; `/` then routes an unverified
  // email account on to `/verify-email`.
  if (user) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
