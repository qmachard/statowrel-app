import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'statowrel.onboarding.demo-answer.v1';

export interface PendingDemoAnswer {
  option_id: string;
  /** ISO instant of the tap, kept so the answer carries when it was really given. */
  answered_at: string;
}

/**
 * The demo question is answered **before there is an account** (docs/prd.md
 * §5.6), and an answer's document id *is* its author's UID — so there is
 * nowhere to write it yet. It waits here, on the phone, and
 * `useDemoAnswerFlush` writes it the first time a session shows up.
 *
 * One pick, overwritten rather than queued: a phone that goes through the
 * carousel twice has changed its mind, not answered twice.
 *
 * Nothing here throws. A pick that cannot be stored is a demo answer that never
 * reaches the tally — the visitor still sees their result, which is the part
 * that matters.
 */
export const rememberDemoAnswer = async (optionId: string): Promise<void> => {
  const pending: PendingDemoAnswer = { option_id: optionId, answered_at: new Date().toISOString() };

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch (error: unknown) {
    console.warn('[onboarding] could not keep the demo answer for later', error);
  }
};

/** The pick waiting to be written, or `null` — anything unreadable counts as nothing waiting. */
export const readPendingDemoAnswer = async (): Promise<PendingDemoAnswer | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);

    if (raw === null) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    // Hand-checked rather than parsed with zod: this is one shape, written by
    // this module alone, and a wrong one only means there is nothing to flush.
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const { option_id: optionId, answered_at: answeredAt } = parsed as Partial<PendingDemoAnswer>;

    if (typeof optionId !== 'string' || optionId === '') {
      return null;
    }

    return { option_id: optionId, answered_at: typeof answeredAt === 'string' ? answeredAt : new Date().toISOString() };
  } catch (error: unknown) {
    console.warn('[onboarding] could not read the demo answer waiting to be written', error);

    return null;
  }
};

export const clearPendingDemoAnswer = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error: unknown) {
    console.warn('[onboarding] could not drop the demo answer once written', error);
  }
};
