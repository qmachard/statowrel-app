import { isValidUsername } from '@statowrel/models';

import { SITE_ORIGIN } from '@/lib/site';

/**
 * The referral link of docs/prd.md §4.9, and the reading of one — the two
 * halves of the same URL shape, kept together so neither can drift.
 *
 * `https://statowrel-app.web.app/i/lou`, and not `statowrel://invite/lou`: a
 * custom scheme opens nothing on a phone that has not installed the app, which
 * is every phone this message is for. An `https` link opens the app when it is
 * there — iOS through the associated domain, Android through the verified
 * intent filter — and the landing page when it is not.
 *
 * `/i/` rather than `/invite/` because the path is typed, read aloud and
 * pasted into messages; two characters is what a link people re-type can
 * afford.
 */
const REFERRAL_SEGMENT = 'i';

/** The scheme a build registers for itself — `app.config.ts`'s `scheme`. */
const APP_SCHEME_PREFIX = 'statowrel://';

/**
 * What an Expo dev client puts between its host and the path it carries
 * (`exp://192.168.1.20:8081/--/i/lou`). Matched so the flow can be exercised on
 * a dev client, where neither the associated domain nor the intent filter is
 * declared.
 */
const DEV_CLIENT_SEPARATOR = '/--/';

const HANDLE_IN_PATH = /^\/?i\/([^/?#]+)/;

export const referralLink = (username: string): string => (
  `${SITE_ORIGIN}/${REFERRAL_SEGMENT}/${username}`
);

/**
 * The sponsor's handle carried by an opened link, or `null` for every other
 * URL the app is ever handed.
 *
 * The host is checked rather than assumed. Both platforms already scope what
 * reaches the app — the association file names `/i/*` alone, the intent filter
 * a `pathPrefix` — but that scoping lives in two files this one cannot see, and
 * a handle is about to be written to a place only a create can fill.
 *
 * The handle itself is shape-checked and nothing more: whether anybody holds it
 * is a Firestore read, and it belongs where the profile is written
 * (`createUserProfile`), with the rule it guards.
 */
export const referrerFromUrl = (url: string): string | null => {
  const path = pathOf(url);

  if (path === null) {
    return null;
  }

  const match = HANDLE_IN_PATH.exec(path);

  if (match === null) {
    return null;
  }

  let handle: string;

  try {
    handle = decodeURIComponent(match[1]);
  } catch {
    // A stray percent sign is not a handle — an unfinished escape is what
    // `decodeURIComponent` throws on, and there is nothing to recover.
    return null;
  }

  const normalized = handle.trim().toLowerCase();

  return isValidUsername(normalized) ? normalized : null;
};

/** The path part of a URL this app is allowed to read a handle out of. */
const pathOf = (url: string): string | null => {
  const separator = url.indexOf(DEV_CLIENT_SEPARATOR);

  if (separator !== -1) {
    return url.slice(separator + DEV_CLIENT_SEPARATOR.length - 1);
  }

  if (url.startsWith(APP_SCHEME_PREFIX)) {
    return url.slice(APP_SCHEME_PREFIX.length);
  }

  if (url.startsWith(`${SITE_ORIGIN}/`)) {
    return url.slice(SITE_ORIGIN.length);
  }

  return null;
};
