import { Linking, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fontSize, fonts, spacing } from '@/design/tokens';
import { SITE_ORIGIN } from '@/lib/site';

/**
 * The legal pages, served as static files by the same Firebase Hosting site as
 * the moderation console — `apps/admin/public/legal/`, reachable without its
 * SPA because Hosting serves a file before it applies a rewrite.
 *
 * Built on `SITE_ORIGIN` rather than derived from a Firebase config value: the
 * pages are public and the same for every build, where `EXPO_PUBLIC_FIREBASE_*`
 * swings with the variant. They are what the stores ask a listing to point at,
 * so they must not depend on which project the binary was built against — and
 * the host is now the same one the referral link and the associated domain are
 * sealed on, which is why it is one constant.
 *
 * `privacy` is the one Apple checks for from inside the app, not only on the
 * listing — hence its place in this footer rather than on the store page alone.
 *
 * `childSafety` is the page Google Play's child safety standards policy demands
 * be published and linked from the Play Console declaration; it is carried here
 * too so the standards are reachable from the app itself, not from the listing
 * alone.
 */
export const LEGAL_URLS = {
  terms: `${SITE_ORIGIN}/legal/cgu`,
  privacy: `${SITE_ORIGIN}/legal/confidentialite`,
  notice: `${SITE_ORIGIN}/legal/mentions-legales`,
  childSafety: `${SITE_ORIGIN}/legal/protection-des-enfants`,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
 * The legal footer: small, grey, out of the way — there to be found when it is
 * looked for, never to compete with the screen it sits under.
 *
 * It stands at the bottom of the Menu screen (docs/prd.md §5.3) *and* of the
 * two doors into the app, where the conditions have to be readable before an
 * account is created rather than only once there is one to open the Menu with.
 *
 * `style` is layout only, per the app's convention — where the footer sits is
 * the screen's business, what it looks like is this component's.
 */
export const LegalLinks = ({ style }: { style?: ViewStyle }) => (
  <View style={[ styles.container, style ]}>
    <LegalLink label="CGU" url={LEGAL_URLS.terms} />
    <Text style={styles.separator}>·</Text>
    <LegalLink label="Confidentialité" url={LEGAL_URLS.privacy} />
    <Text style={styles.separator}>·</Text>
    <LegalLink label="Mentions légales" url={LEGAL_URLS.notice} />
    <Text style={styles.separator}>·</Text>
    <LegalLink label="Sécurité des enfants" url={LEGAL_URLS.childSafety} />
  </View>
);
