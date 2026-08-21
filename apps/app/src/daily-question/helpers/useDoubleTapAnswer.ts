import { useEffect, useRef, useState } from 'react';

import { hapticSelection } from '@/lib/haptics';

/**
 * The guard of docs/prd.md §4.3: a second tap landing sooner than this is an
 * accidental double tap, not a validation. The answer is final, so the cost of
 * ignoring one real tap is a tap; the cost of taking a stray one is a wrong
 * answer nobody can undo.
 */
export const VALIDATION_DELAY_MS = 150;

export interface DoubleTapAnswer {
  /** The option waiting for its second tap, or `null` — what `QuestionOption` renders as lifted. */
  selectedId: string | null;
  /** One tap on an option: it selects, or — on the same option, past the guard — it validates. */
  pick: (optionId: string) => void;
}

/**
 * The double tap of docs/prd.md §4.3, without the question it is about: first
 * tap selects and gives the light haptic, second tap on the *same* option calls
 * `onValidate`, and tapping another one only moves the selection — one never
 * validates by changing one's mind.
 *
 * A hook rather than two copies of the same timer, because the app poses the
 * same interaction twice: the real question of `DailyQuestionScreen`, and the
 * sample one the onboarding carousel opens with (`src/onboarding/`). The
 * signature interaction of the product is not something two screens should be
 * free to time differently.
 *
 * The selection is dropped the moment it validates — the option sinks, and what
 * comes next is the result taking the options' place (docs/prd.md §4.3), not a
 * row still asking to be tapped again. So there is nothing for a caller to
 * reset, and nothing it can leave selected by forgetting to.
 */
export const useDoubleTapAnswer = (onValidate: (optionId: string) => void): DoubleTapAnswer => {
  const [ selectedId, setSelectedId ] = useState<string | null>(null);
  // False for the first `VALIDATION_DELAY_MS` of a selection — the guard above.
  const [ armed, setArmed ] = useState(false);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (armTimer.current !== null) {
      clearTimeout(armTimer.current);
    }
  }, []);

  const pick = (optionId: string) => {
    if (selectedId !== optionId) {
      // Changing one's mind never validates — it only moves the selection, and
      // re-arms the guard from scratch.
      setSelectedId(optionId);
      setArmed(false);
      hapticSelection();

      if (armTimer.current !== null) {
        clearTimeout(armTimer.current);
      }

      armTimer.current = setTimeout(() => setArmed(true), VALIDATION_DELAY_MS);

      return;
    }

    if (armed) {
      setSelectedId(null);
      setArmed(false);
      onValidate(optionId);
    }
  };

  return { selectedId, pick };
};
