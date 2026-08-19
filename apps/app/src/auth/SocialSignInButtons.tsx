import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, fontSize, fonts, spacing } from '@/design/tokens';

import { SignInCancelledError, authErrorMessage } from './errors';
import {
  isAppleSignInAvailableAsync,
  isGoogleSignInAvailable,
  signInWithApple,
  signInWithGoogle,
} from './providers';

type Pending = 'google' | 'apple' | null;

const styles = StyleSheet.create({
  root: {
    gap: spacing(3),
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.destructive,
  },
});

/**
 * The three sign-in methods sit at the same level (docs/prd.md §4.1). Apple is
 * only rendered where the OS supports it — which is also where the App Store
 * requires it.
 */
export const SocialSignInButtons = ({ disabled = false }: { disabled?: boolean }) => {
  const [ googleAvailable ] = useState(isGoogleSignInAvailable);
  const [ appleAvailable, setAppleAvailable ] = useState(false);
  const [ pending, setPending ] = useState<Pending>(null);
  const [ error, setError ] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    isAppleSignInAvailableAsync()
      .then((available) => {
        if (mounted) {
          setAppleAvailable(available);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const run = async (provider: Exclude<Pending, null>, signIn: () => Promise<unknown>) => {
    setError(null);
    setPending(provider);

    try {
      await signIn();
      // On success the auth listener swaps the navigation stack — nothing to do
      // here, and the component unmounts.
    } catch (caught) {
      if (!(caught instanceof SignInCancelledError)) {
        setError(authErrorMessage(caught, provider));
      }

      setPending(null);
    }
  };

  if (!googleAvailable && !appleAvailable) {
    return null;
  }

  return (
    <View style={styles.root}>
      {googleAvailable ? (
        <Button
          label="Continuer avec Google"
          variant="outline"
          loading={pending === 'google'}
          disabled={disabled || pending !== null}
          onPress={() => run('google', signInWithGoogle)}
        />
      ) : null}

      {appleAvailable ? (
        <Button
          label="Continuer avec Apple"
          variant="secondary"
          loading={pending === 'apple'}
          disabled={disabled || pending !== null}
          onPress={() => run('apple', signInWithApple)}
        />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};
