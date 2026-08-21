import { useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { colors, pagePadding, spacing } from '@/design/tokens';
import { registerDeviceForPush } from '@/notifications/data/deviceRegistration';

import { DemoQuestionSheet } from '../components/DemoQuestionSheet';
import { OnboardingDots } from '../components/OnboardingDots';
import { OnboardingSlide } from '../components/OnboardingSlide';
import { OnboardingVisual } from '../components/OnboardingVisual';
import { ALLOW_NOTIFICATIONS, NEXT, SKIP, SLIDES } from '../copy';
import { useDemoQuestion } from '../data/useDemoQuestion';

const styles = StyleSheet.create({
  // Laid over the whole app rather than pushed as a route: it is a first
  // launch, not a destination — nothing pushes it, nothing pops it, and the
  // Stats screen it hands over to is already mounted underneath.
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
 * What StatOwrel is, in four slides and one real question — what a freshly
 * signed-in account meets, once it has a handle and before it sees the Stats
 * screen it is laid over (docs/prd.md §5.6).
 *
 * It is driven by state, not by a route: `src/App.tsx` renders it beside the
 * navigator the way it renders the username sheet, and for the same reason —
 * both are up exactly while their condition holds. Every way out of it is the
 * same one, `onDone`, which remembers this account has been through it
 * (`useOnboardingSeen`) and lands on the app underneath.
 *
 * The last two slides each do something rather than only say it. The
 * notification one **registers this phone for push on its own call to action** —
 * which is what raises the system dialog, and the point of the slide is that
 * the dialog is never sprung on somebody with nothing on screen explaining it,
 * a refusal being final on both platforms. `usePushNotifications` deliberately
 * never asks at launch for that reason; it registers silently once the
 * permission is there. Then the demo of `DemoQuestionSheet` pops behind it.
 *
 * The demo is offered only when there is one to pose: a question that could not
 * be read simply ends the carousel, never a step somebody is stuck on. The
 * permission is asked either way — it is worth asking whether or not there is a
 * sample to follow it.
 */
export const OnboardingCarousel = ({ onDone }: OnboardingCarouselProps) => {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { question } = useDemoQuestion();

  const scroller = useRef<ScrollView>(null);
  const [ current, setCurrent ] = useState(0);
  const [ asking, setAsking ] = useState(false);
  const [ demoOpen, setDemoOpen ] = useState(false);

  const last = SLIDES.length - 1;
  const isLast = current === last;

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCurrent(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  /**
   * What the last slide's button does: ask for the permission and register this
   * phone with it, then move on whatever the answer was. A « non » is a
   * legitimate answer — it costs the daily banner, not the app — and it is
   * never asked twice (`canAskAgain` is false afterwards, so the dialog would
   * not even show).
   */
  const askThenContinue = async () => {
    setAsking(true);

    try {
      if (user !== null) {
        await registerDeviceForPush(user.uid, { ask: true });
      }
    } finally {
      setAsking(false);
    }

    if (question === null) {
      onDone();

      return;
    }

    setDemoOpen(true);
  };

  const advance = () => {
    if (!isLast) {
      scroller.current?.scrollTo({ x: width * (current + 1), animated: true });

      return;
    }

    void askThenContinue();
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={[ 'top', 'bottom' ]} style={styles.safeArea}>
        <View style={styles.header}>
          <Button label={SKIP} variant="ghost" size="sm" onPress={onDone} />
        </View>

        <ScrollView
          ref={scroller}
          style={styles.pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
        >
          {SLIDES.map((slide) => (
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
          <OnboardingDots count={SLIDES.length} current={current} />

          <Button
            label={isLast ? ALLOW_NOTIFICATIONS : NEXT}
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
          onFinish={onDone}
        />
      )}
    </View>
  );
};
