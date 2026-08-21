import { useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { colors, pagePadding, spacing } from '@/design/tokens';
import { navigationRef } from '@/navigation/navigationRef';
import { requestPushPermission } from '@/notifications/data/deviceRegistration';

import { DemoQuestionSheet } from '../components/DemoQuestionSheet';
import { OnboardingDots } from '../components/OnboardingDots';
import { OnboardingSlide } from '../components/OnboardingSlide';
import { OnboardingVisual } from '../components/OnboardingVisual';
import { ANSWER, NEXT, SKIP, SLIDES } from '../copy';
import { useDemoQuestion } from '../data/useDemoQuestion';

const styles = StyleSheet.create({
  // Laid over the whole app rather than pushed as a route: the carousel comes
  // before there is a session, and the navigator underneath already holds the
  // sign-in screen it hands over to.
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  // Bounded by the column it sits in, so each slide's own `flex: 1` has a
  // height to fill rather than collapsing onto its content.
  pager: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: pagePadding,
    paddingTop: spacing(2),
  },
  footer: {
    gap: spacing(6),
    paddingHorizontal: pagePadding,
    paddingBottom: spacing(6),
    paddingTop: spacing(4),
  },
});

export interface OnboardingCarouselProps {
  /** Marks the carousel seen for good — the only way it ever closes. */
  onDone: () => void;
}

/**
 * What StatOwrel is, in four slides and one real question — the first thing a
 * fresh install shows, before the sign-in screen behind it.
 *
 * It is driven by state, not by a route: `src/App.tsx` renders it beside the
 * navigator the way it renders the username sheet, because there is no session
 * yet to navigate under. Every way out of it is the same one — `onDone`, which
 * remembers this install has been through it (`useOnboardingSeen`) — and the
 * two calls to action differ only in where they leave the visitor: « Passer »
 * on the sign-in screen already mounted underneath, « Créer mon compte » on the
 * sign-up one.
 *
 * The last two slides each do something rather than only say it. The
 * notification one raises the system permission dialog on its own « Suivant » —
 * the point of the slide is that the dialog is never the first thing seen,
 * since a refusal is final on both platforms — and « C'est parti » is the one
 * button of the carousel that does not advance: it opens the demo of
 * `DemoQuestionSheet`. Neither needs an account: the permission belongs to the
 * phone, and the demo's pick waits on it until there is one
 * (`useDemoAnswerFlush`).
 *
 * **The last slide only exists when there is a question to pose.** A demo that
 * could not be read would leave it announcing something nothing follows, so it
 * is dropped and the carousel ends on the notification slide instead. The
 * permission is asked either way — it is worth asking whether or not there is a
 * sample behind it.
 */
export const OnboardingCarousel = ({ onDone }: OnboardingCarouselProps) => {
  const { width } = useWindowDimensions();
  const { question } = useDemoQuestion();

  const scroller = useRef<ScrollView>(null);
  const [ current, setCurrent ] = useState(0);
  const [ asking, setAsking ] = useState(false);
  const [ demoOpen, setDemoOpen ] = useState(false);

  // Announcing « C'est parti » in front of a demo that could not be read would
  // be announcing nothing, so that slide comes and goes with its question.
  const slides = question === null ? SLIDES.filter((slide) => slide.key !== 'start') : SLIDES;
  const currentKey = slides[current]?.key ?? null;
  const isLast = current === slides.length - 1;

  const finish = (destination: 'SignIn' | 'SignUp') => {
    // Navigating first: the stack underneath is the signed-out one, so the
    // screen is already there — this only picks which of its two the visitor
    // lands on once the carousel is gone. Two calls rather than one on the
    // union: `navigate` resolves its params from the screen name, which a union
    // of names cannot narrow.
    if (navigationRef.isReady()) {
      if (destination === 'SignUp') {
        navigationRef.navigate('SignUp');
      } else {
        navigationRef.navigate('SignIn');
      }
    }

    onDone();
  };

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCurrent(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const goToNextSlide = () => scroller.current?.scrollTo({ x: width * (current + 1), animated: true });

  /**
   * What the notification slide's button does before moving on: raise the
   * permission dialog, and take whatever comes back. A « non » is a legitimate
   * answer — it costs the daily banner, not the app — and it is never asked
   * twice (`canAskAgain` is false afterwards, so the dialog would not even
   * show). The token itself is registered at the first signed-in launch; there
   * is no account here.
   */
  const askThenAdvance = async () => {
    setAsking(true);

    try {
      await requestPushPermission();
    } finally {
      setAsking(false);
    }

    // Last only when there is no demo to announce — nothing follows this slide
    // then, so the carousel hands over to the sign-up screen.
    if (isLast) {
      finish('SignUp');

      return;
    }

    goToNextSlide();
  };

  const advance = () => {
    if (currentKey === 'notifications') {
      void askThenAdvance();

      return;
    }

    if (currentKey === 'start') {
      setDemoOpen(true);

      return;
    }

    goToNextSlide();
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={[ 'top', 'bottom' ]} style={styles.safeArea}>
        <View style={styles.header}>
          <Button label={SKIP} variant="ghost" size="sm" onPress={() => finish('SignIn')} />
        </View>

        <ScrollView
          ref={scroller}
          style={styles.pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
        >
          {slides.map((slide) => (
            <OnboardingSlide
              key={slide.key}
              width={width}
              title={slide.title}
              body={slide.body}
              visual={<OnboardingVisual slideKey={slide.key} />}
            />
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <OnboardingDots count={slides.length} current={current} />

          <Button
            label={currentKey === 'start' ? ANSWER : NEXT}
            loading={asking}
            onPress={advance}
          />
        </View>
      </SafeAreaView>

      {question === null ? null : (
        <DemoQuestionSheet
          visible={demoOpen}
          question={question}
          onClose={() => setDemoOpen(false)}
          onSignUp={() => finish('SignUp')}
        />
      )}
    </View>
  );
};
