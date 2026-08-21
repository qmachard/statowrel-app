/**
 * What the carousel says about StatOwrel, in the order it says it — docs/prd.md
 * §1, cut into the four things somebody who has just signed up has to
 * understand: the daily question, the StatOwrel it gives back, the friends it
 * unlocks, and why the notification is worth accepting.
 *
 * `key` is what the carousel hangs each slide's illustration on, so the wording
 * and the drawing stay in two places that can each be changed alone.
 */
export type OnboardingSlideKey = 'daily' | 'statowrel' | 'friends' | 'notifications';

export interface OnboardingSlideCopy {
  key: OnboardingSlideKey;
  title: string;
  body: string;
}

export const SLIDES: OnboardingSlideCopy[] = [
  {
    key: 'daily',
    title: 'Une question par jour',
    body: 'La même pour tout le monde. Tu as la journée pour y répondre.',
  },
  {
    key: 'statowrel',
    title: 'Ta StatOwrel',
    body: 'Ta réponse, replacée dans celle des autres. Tout le jeu tient dans cette phrase.',
  },
  {
    key: 'friends',
    title: 'Les réponses de tes potes',
    body: 'Tu les découvres une fois que tu as donné la tienne. Pas de feed, pas de likes.',
  },
  {
    key: 'notifications',
    title: 'On te prévient',
    body: 'La question du jour, un rappel le soir si tu l’as loupée, et quand un pote t’ajoute. Rien de plus.',
  },
];

/** The sample phrase of the second slide — a StatOwrel that belongs to nobody. */
export const SAMPLE_STATOWREL = {
  share: '12%',
  label: 'Anarchiste',
};

export const SKIP = 'Passer';
export const NEXT = 'Suivant';
/**
 * The last slide's call to action. It raises the system permission dialog and,
 * whatever the answer, opens the demo question behind it — the refusal is the
 * dialog's own « Ne pas autoriser », not a second button here.
 */
export const ALLOW_NOTIFICATIONS = 'Me prévenir';
/** What closes the demo question, and the carousel with it — the app is behind. */
export const DONE = 'C’est parti';

/** Said on the demo's result, where a real day would show the friends. */
export const DEMO_DISCLAIMER = 'Celle-là ne compte pas. Les vraies arrivent chaque jour, avec tes potes en face.';

/** The date line of the demo's result: it is nobody's day. */
export const DEMO_DAY_LABEL = 'Question démo';
