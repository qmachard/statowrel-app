import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthContext';
import { signOut } from '@/auth/providers';
import { Button } from '@/components/Button';
import { shadows } from '@/design/shadows';
import { borderWidth, colors, fontSize, fonts, radius, spacing } from '@/design/tokens';

const PROVIDER_LABELS: Record<string, string> = {
  'password': 'E-mail',
  'google.com': 'Google',
  'apple.com': 'Apple',
  'facebook.com': 'Facebook',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    gap: spacing(8),
    padding: spacing(6),
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },
  heading: {
    fontFamily: fonts.head,
    fontSize: fontSize.xl,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  card: {
    gap: spacing(2),
    borderRadius: radius.md,
    borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing(6),
    paddingVertical: spacing(5),
  },
  name: {
    fontFamily: fonts.head,
    fontSize: fontSize['2xl'],
    textTransform: 'uppercase',
    color: colors['card-foreground'],
  },
  detail: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors['muted-foreground'],
  },
  uid: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors['muted-foreground'],
  },
});

export const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, profile } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[ 'top' ]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* The stack has no header (and no tab bar since docs/prd.md §5.1), so the
            way back to Stats has to live in the screen. */}
        <View style={styles.head}>
          <Button label="Retour" variant="outline" size="icon-sm" icon={ChevronLeft} onPress={() => navigation.goBack()} />
          <Text style={styles.heading}>Profil</Text>
        </View>

        <View style={[ styles.card, shadows.md ]}>
          <Text style={styles.name}>
            {profile?.display_name ?? 'Profil en cours de création…'}
          </Text>
          <Text style={styles.detail}>{profile?.email ?? user.email ?? '—'}</Text>
          <Text style={styles.detail}>
            Connecté via {profile?.auth_providers.map((provider) => PROVIDER_LABELS[provider] ?? provider).join(', ') || '—'}
          </Text>
          <Text style={styles.uid}>UID {user.uid}</Text>
        </View>

        <Button label="Se déconnecter" variant="secondary" onPress={() => signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
};
