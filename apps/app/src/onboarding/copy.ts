/**
 * What the carousel says about StatOwrel, in the order it says it — docs/prd.md
 * §1, cut into the four things somebody who has never opened the app has to
 * understand before signing up: the daily question, the StatOwrel it gives
 * back, the friends it unlocks, and why the notification is worth accepting.
 *
 * The first three carry the store's own screenshot captions word for word
 * (`docs/store-listing.md` §3.1): the sentence that made somebody install the
 * app is the sentence that should greet them when it opens. The last two are
 * the carousel's alone — no store screenshot asks for a permission or poses a
 * question — so they keep the app's plainer voice.
 *
 * The store's fourth caption, the one about the streak unlocking the right to
 * propose a question, is deliberately **not** here: the proposal form does not
 * exist yet (`ProposeQuestionButton` opens nothing), and a promise made at
 * sign-up is a disappointment scheduled for day 30.
 *
 * A title runs to three lines at `3xl` — `OnboardingSlide` reserves the room so
 * the sentence under it does not move from one slide to the next.
 *
 * `key` is what the carousel hangs each slide's illustration on, so the wording
 * and the drawing stay in two places that can each be changed alone.
 */
export type OnboardingSlideKey = 'daily' | 'statowrel' | 'friends' | 'notifications' | 'start';

export interface OnboardingSlideCopy {
  key: OnboardingSlideKey;
  title: string;
  body: string;
}

export const SLIDES: OnboardingSlideCopy[] = [
  {
    key: 'daily',
    title: 'Une question que personne n’ose poser.',
    body: 'Tous les matins. Deux taps pour être honnête.',
  },
  {
    key: 'statowrel',
    title: 'La stat qui dit qui tu es.',
    body: 'Chaque réponse te donne ta StatOwrel. Rare ou banal, c’est écrit.',
  },
  {
    key: 'friends',
    title: 'Tes potes vont te surprendre.',
    body: 'Vois ce qu’ils ont vraiment répondu. Sujet de conversation garanti.',
  },
  {
    key: 'notifications',
    // The point at the end of every title is the store captions' own
    // punctuation, kept on these two so the five read as one set.
    title: 'On te prévient.',
    body: 'La question du jour, un rappel le soir si tu l’as loupée, et quand un pote t’ajoute. Rien de plus.',
  },
  {
    key: 'start',
    title: 'C’est parti.',
    body: 'Un tap choisit ta réponse, un deuxième la valide. Essaie tout de suite, sur une vraie question.',
  },
];

/** The sample phrase of the second slide — a StatOwrel that belongs to nobody. */
export const SAMPLE_STATOWREL = {
  share: '12%',
  label: 'Anarchiste',
};

export const SKIP = 'Passer';
/**
 * The same word on every slide but the last, the notification one included —
 * where it also raises the system permission dialog before moving on. Labelling
 * that button « Me prévenir » turned a step of the carousel into a commitment;
 * the promise is the slide's job, the button only moves forward, and the
 * refusal is the dialog's own « Ne pas autoriser ».
 */
export const NEXT = 'Suivant';
/**
 * The last slide's own call to action, and the only button of the carousel that
 * does something other than advance: it opens the demo question.
 */
export const ANSWER = 'Répondre';
/** What closes the demo question, and the carousel with it — the sign-up screen is behind. */
export const SIGN_UP = 'Créer mon compte';

/** Said on the demo's result, where a real day would show the friends. */
export const DEMO_DISCLAIMER = 'Celle-là ne compte pas. Les vraies arrivent chaque jour, avec tes potes en face.';

/** The date line of the demo's result: it is nobody's day. */
export const DEMO_DAY_LABEL = 'Question démo';
