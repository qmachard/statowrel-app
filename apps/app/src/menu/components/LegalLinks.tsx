import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, fonts, spacing } from '@/design/tokens';

/**
 * The two legal pages, served as static files by the same Firebase Hosting site
 * as the moderation console — `apps/admin/public/legal/`, reachable without its
 * SPA because Hosting serves a file before it applies a rewrite.
 *
 * Written out rather than derived from a Firebase config value: the pages are
 * public and the same for every build, where `EXPO_PUBLIC_FIREBASE_*` swings
 * with the variant. They are what the stores ask a listing to point at, so they
 * must not depend on which project the binary was built against.
 */
export const LEGAL_URLS = {
  terms: 'https://statowrel-app.web.app/legal/cgu',
  notice: 'https://statowrel-app.web.app/legal/mentions-legales',
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
  },
  link: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors['muted-foreground'],
    textDecorationLine: 'underline',
  },
  separator: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors['muted-foreground'],
  },
  pressed: {
    opacity: 0.6,
  },
});

const open = (url: string) => {
  // A device with no browser to hand it to is not worth an error state on a
  // footer: the link is the only thing that fails, and it fails silently.
  Linking.openURL(url).catch((error: unknown) => {
    console.warn('[legal] could not open the legal page', error);
  });
};

const LegalLink = ({ label, url }: { label: string; url: string }) => (
  <Pressable accessibilityRole="link" onPress={() => open(url)}>
    {({ pressed }) => (
      <Text style={[ styles.link, pressed ? styles.pressed : null ]}>{label}</Text>
    )}
  </Pressable>
);

/**
 * The legal footer of the Profile screen (docs/prd.md §5.3): small, grey, out of
 * the way — there to be found when it is looked for, never to compete with the
 * screen.
 */
export const LegalLinks = () => (
  <View style={styles.container}>
    <LegalLink label="CGU" url={LEGAL_URLS.terms} />
    <Text style={styles.separator}>·</Text>
    <LegalLink label="Mentions légales" url={LEGAL_URLS.notice} />
  </View>
);
