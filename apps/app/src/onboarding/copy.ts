/**
 * What the carousel says about StatOwrel, in the order it says it — docs/prd.md
 * §1, cut into the three things somebody who has never opened the app has to
 * understand before signing up: the daily question, the StatOwrel it gives
 * back, and the friends it unlocks.
 *
 * `key` is what the carousel hangs each slide's illustration on, so the wording
 * and the drawing stay in two places that can each be changed alone.
 */
export type OnboardingSlideKey = 'daily' | 'statowrel' | 'friends';

export interface OnboardingSlideCopy {
  key: OnboardingSlideKey;
  title: string;
  body: string;
}

export const SLIDES: OnboardingSlideCopy[] = [
  {
    key: 'daily',
    title: 'Une question par jour',
    body: 'Tous les matins à 7h, la même question pour tout le monde. Une seule, personnelle, un peu absurde — et la journée entière pour y répondre.',
  },
  {
    key: 'statowrel',
    title: 'Ta StatOwrel',
    body: 'Ta réponse replacée dans celle de tout le monde. C’est tout le jeu, et ça tient en une phrase.',
  },
  {
    key: 'friends',
    title: 'Et les réponses de tes potes',
    body: 'Débloquées seulement une fois que tu as donné la tienne. Pas de feed, pas de likes, pas de compteur de vues.',
  },
];

/** The sample phrase of the second slide — a StatOwrel that belongs to nobody. */
export const SAMPLE_STATOWREL = {
  share: '12%',
  label: 'Anarchiste',
};

export const SKIP = 'Passer';
export const NEXT = 'Suivant';
/** The last slide's call to action, when there is a demo question to pose. */
export const TRY = 'Essayer, pour voir';
export const SIGN_UP = 'Créer mon compte';

/** Said on the demo's result, where the real app would show the friends. */
export const DEMO_DISCLAIMER = 'Celle-là ne compte pas — les vraies tombent à 7h, avec tes potes en face.';

/** The date line of the demo's result: it is nobody's day. */
export const DEMO_DAY_LABEL = 'Question démo';
