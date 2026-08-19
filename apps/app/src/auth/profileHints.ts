/**
 * Some profile fields are only ever handed over once, by the sign-up flow that
 * produced the account: the pseudo typed in the email form, and Apple's
 * `fullName`, which Apple returns on the very first authorization and never
 * again. They are recorded here *before* the Firebase sign-in call, so the
 * `onAuthStateChanged` listener that creates the profile document can consume
 * them without racing the call that produced them.
 */
export interface ProfileHints {
  displayName?: string | null;
}

let pendingHints: ProfileHints | null = null;

export const rememberProfileHints = (hints: ProfileHints): void => {
  pendingHints = hints;
};

export const consumeProfileHints = (): ProfileHints | null => {
  const hints = pendingHints;
  pendingHints = null;

  return hints;
};
