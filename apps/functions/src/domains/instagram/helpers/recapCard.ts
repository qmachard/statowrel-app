import path from 'node:path';

import { type SKRSContext2D, createCanvas, loadImage } from '@napi-rs/canvas';

import { DAILY_QUESTION_TIME_ZONE } from '@statowrel/models';

import {
  BASELINE,
  BORDER_WIDTH,
  CARD_HEIGHT,
  CARD_PADDING,
  CARD_WIDTH,
  INSTAGRAM_HANDLE,
  fonts,
  palette,
  radius,
} from './brand';
import { ASSETS_DIR, registerBrandFonts } from './canvasFonts';
import {
  type FittedText,
  type Rect,
  clamp,
  drawLines,
  drawSurface,
  ellipsize,
  fitText,
  font,
  roundRectPath,
  textBlockHeight,
  withRotation,
  wrapText,
} from './drawing';
import type { DailyRecap } from './recapData';

const CONTENT_WIDTH = CARD_WIDTH - CARD_PADDING * 2;

/**
 * JPEG at 92, and JPEG because Instagram's `image_url` accepts nothing else.
 *
 * 92 rather than 100: the last eight points buy nothing the feed's own
 * recompression will not take back, and cost about a third of the file — which
 * matters only because Meta fetches the URL itself and gives up on a slow one.
 */
const JPEG_QUALITY = 92;

/**
 * How far each card leans, in degrees.
 *
 * Opposite ways and by different amounts on purpose: three rectangles at the
 * same angle read as a template, two leaning against each other read as a
 * collage. The third slide stays straight — it is the one asking for something,
 * and a tilted button reads as decoration.
 */
const RESULT_TILT = -5;
const QUESTION_TILT = 2.5;

/** Air between the closing line and the StatOwrel it introduces — see `drawLines` below. */
const STAT_GAP = 16;

/** « Vendredi 21 août » — the day the recap is about, capitalised as a line of its own. */
const dayLabel = (date: string): string => {
  const label = new Intl.DateTimeFormat('fr-FR', {
    timeZone: DAILY_QUESTION_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    // Read at noon UTC rather than at midnight: a `YYYY-MM-DD` parsed as UTC
    // midnight is still the previous day in a timezone west of Greenwich, and
    // Paris is east of it in winter only.
  }).format(new Date(`${date}T12:00:00Z`));

  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
};

/**
 * A percentage as the card writes it — « 24 % », never « 23,8 % ».
 *
 * It is handed the whole number `recapData` apportioned rather than a share to
 * round here, so nothing on the post can round the same share two ways.
 */
const percentLabel = (percent: number): string => `${percent} %`;

const drawBackground = (ctx: SKRSContext2D, fill: string): void => {
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
};

/**
 * The two lines every slide is framed by: the day, top left, and what to do
 * next, bottom right.
 *
 * They sit on the page rather than on the card, and they are the only things
 * that do — which is what lets the card lean without taking the reading order
 * with it. The bottom line always ends in an arrow, because the first two
 * slides are asking for a swipe and the last one for a tap, and the gesture is
 * the same shape either way.
 */
const drawFrame = (
  ctx: SKRSContext2D,
  { date, action, color, actionColor }: { date: string; action: string; color: string; actionColor: string },
): void => {
  ctx.textBaseline = 'middle';

  ctx.font = font(fonts.sansMedium, 34);
  ctx.fillStyle = color;
  ctx.fillText(dayLabel(date), CARD_PADDING, CARD_PADDING + 26);

  ctx.font = font(fonts.sansMedium, 42);
  ctx.fillStyle = actionColor;
  ctx.textAlign = 'right';
  ctx.fillText(`${action} →`, CARD_WIDTH - CARD_PADDING, CARD_HEIGHT - CARD_PADDING - 26);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
};

/**
 * Slide 1 — the number, and the sentence the app already says around it.
 *
 * No question, no bars, no breakdown: the whole slide is « Comme 24 % des gens,
 * tu es (peut-être) un.e PERFECTIONNISTE », which is the only thing that can be
 * read from a feed at thumb speed. What people were answering is slide 2's job,
 * and holding it back is what makes the carousel worth swiping — a post that
 * says everything on its first image is a post nobody swipes, and Instagram
 * counts the swipe.
 *
 * **The subject is « tu », and that is not a stylistic choice.** A
 * `stat_label` is authored to finish « tu es un.e … » (docs/prd.md §5.5), so it
 * is always singular: « PERFECTIONNISTE », « STRATÈGE », « AJUSTÉ·E ». Hung off
 * a plural subject — « des gens sont PERFECTIONNISTE » — every one of them is
 * ungrammatical, and the alternative is pluralising them here, which means
 * guessing French from a suffix (« banal » would come out « banaux ») on words
 * half of which are inclusive forms. Borrowing the result screen's own sentence
 * costs nothing and cannot be wrong, whatever anybody types into the proposal
 * form. « (peut-être) » is the wink that keeps a statistic from reading as a
 * verdict.
 */
const renderResultSlide = (recap: DailyRecap): Buffer => {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, palette.background);
  drawFrame(ctx, {
    date: recap.date,
    action: 'Découvre la StatOwrel',
    color: palette['muted-foreground'],
    actionColor: palette.foreground,
  });

  const cardWidth = 940;
  const inset = 84;
  const innerWidth = cardWidth - inset * 2;

  const opening = { lines: [ 'Comme' ], fontSize: 44, lineHeight: 54 };
  const percent = { lines: [ percentLabel(recap.top.percent) ], fontSize: 180, lineHeight: 186 };

  ctx.font = font(fonts.sans, 44);
  const closing = fitText(ctx, 'des gens, tu es (peut-être) un.e', {
    family: fonts.sans,
    maxWidth: innerWidth,
    maxLines: 2,
    max: 44,
    min: 32,
    lineHeightRatio: 1.3,
  });

  // The StatOwrel is what the slide is *about*, so it takes every pixel the
  // card can give it — a one-word « SAGE » lands at the ceiling, a
  // 30-character one (`QUESTION_OPTION_STAT_LABEL_MAX_LENGTH`) walks down to
  // two lines rather than being cut.
  const stat = fitText(ctx, recap.top.statLabel.toUpperCase(), {
    family: fonts.head,
    maxWidth: innerWidth,
    maxLines: 2,
    max: 108,
    min: 40,
  });

  const blocks = [ opening, percent, closing, stat ];
  const contentHeight = blocks.reduce((total, block) => total + textBlockHeight(block), 0) + STAT_GAP;
  // The card is sized by its sentence rather than fixed: a two-line StatOwrel
  // and a two-line closing add 150px between them, and a card that did not grow
  // would print them over its own border.
  const cardHeight = contentHeight + inset * 2;

  withRotation(ctx, { cx: CARD_WIDTH / 2, cy: 680, degrees: RESULT_TILT }, () => {
    drawSurface(ctx, { x: -cardWidth / 2, y: -cardHeight / 2, width: cardWidth, height: cardHeight }, {
      fill: palette.accent,
      radius: radius.lg,
    });

    let y = -contentHeight / 2;

    y = drawLines(ctx, opening, { x: 0, y, family: fonts.sans, color: palette.card, align: 'center' });
    y = drawLines(ctx, percent, { x: 0, y, family: fonts.head, color: palette.card, align: 'center' });
    y = drawLines(ctx, closing, { x: 0, y, family: fonts.sans, color: palette.card, align: 'center' });
    // The closing line runs into the StatOwrel without this: one is set at
    // 44px and the other at up to 108, so their line boxes touch long before
    // the words look separated.
    drawLines(ctx, stat, { x: 0, y: y + STAT_GAP, family: fonts.head, color: palette.card, align: 'center' });
  });

  return canvas.toBuffer('image/jpeg', JPEG_QUALITY);
};

/**
 * One option as a bar whose **fill width is its share** — the label inside on
 * the left, the percentage on the right.
 *
 * The same anatomy as the app's `AnswerShareRow`, so somebody who has seen the
 * result screen recognises the post: the dominant answer takes `primary`, the
 * others `muted`, and the track underneath is the card it sits on.
 *
 * Drawn with paths and a clip rather than two rectangles, so the fill keeps the
 * pill's round end instead of squaring it off at 100 %.
 */
const drawOptionRow = (
  ctx: SKRSContext2D,
  rect: Rect,
  { label, share, percent, dominant }: { label: string; share: number; percent: number; dominant: boolean },
): void => {
  ctx.save();
  roundRectPath(ctx, rect, radius.full);
  ctx.clip();
  ctx.fillStyle = dominant ? palette.primary : palette.muted;
  // A share under a couple of percent still has to read as a bar rather than as
  // a sliver of border, hence the floor: the number beside it is the truth, the
  // fill is the shape of it.
  ctx.fillRect(rect.x, rect.y, Math.max(rect.width * share, rect.height), rect.height);
  ctx.restore();

  // Thinner than the card's own border: the surface around these rows already
  // carries the full weight, and repeating it six times inside makes a grid.
  ctx.lineWidth = BORDER_WIDTH / 2;
  ctx.strokeStyle = palette.foreground;
  roundRectPath(ctx, rect, radius.full);
  ctx.stroke();

  const textSize = clamp(Math.round(rect.height * 0.38), 24, 38);
  const inset = Math.round(rect.height * 0.42);

  ctx.textBaseline = 'middle';
  ctx.fillStyle = palette.foreground;

  ctx.font = font(fonts.head, textSize);
  const percentText = percentLabel(percent);
  const percentWidth = Math.round(ctx.measureText(percentText).width);

  ctx.textAlign = 'right';
  ctx.fillText(percentText, rect.x + rect.width - inset, rect.y + rect.height / 2);

  ctx.textAlign = 'left';
  ctx.fillText(
    ellipsize(ctx, label, fonts.sansMedium, textSize, rect.width - inset * 2 - percentWidth - 28),
    rect.x + inset,
    rect.y + rect.height / 2,
  );

  ctx.textBaseline = 'alphabetic';
};

/**
 * Slide 2 — the question, and what everybody answered.
 *
 * Slide 1 gave one number; this is the column behind it, one bar per option
 * with its own share as the width of its fill. It is the slide that earns a
 * comment: « 24 % » is a fact, the gap between the second and the third answer
 * is an argument.
 */
const renderQuestionSlide = (recap: DailyRecap): Buffer => {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, palette.accent);
  drawFrame(ctx, {
    date: recap.date,
    action: 'Télécharge StatOwrel',
    // The date is a caption on this slide, not a title: white at full strength
    // would compete with the question, which is the one thing on the page.
    color: 'rgba(255, 255, 255, 0.72)',
    actionColor: palette.foreground,
  });

  const cardWidth = 950;
  const inset = 56;
  // The rows are what the card is sized around: a two-option day gets generous
  // bars, a six-option one the tightest that still takes a 24px label. The card
  // then grows to whatever they need, rather than the rows being squeezed into
  // a fixed one.
  const rowHeight = clamp(Math.round(460 / recap.options.length), 62, 104);
  const rowGap = recap.options.length <= 4 ? 24 : 18;

  const question: FittedText = (() => {
    ctx.font = font(fonts.head, 54);

    return fitText(ctx, recap.question, {
      family: fonts.head,
      maxWidth: cardWidth - inset * 2,
      maxLines: 3,
      max: 54,
      min: 36,
    });
  })();

  const rowsHeight = recap.options.length * rowHeight + (recap.options.length - 1) * rowGap;
  const cardHeight = inset * 2 + textBlockHeight(question) + 44 + rowsHeight;

  withRotation(ctx, { cx: CARD_WIDTH / 2, cy: CARD_HEIGHT / 2, degrees: QUESTION_TILT }, () => {
    const top = -cardHeight / 2;

    drawSurface(ctx, { x: -cardWidth / 2, y: top, width: cardWidth, height: cardHeight }, {
      fill: palette.card,
      radius: radius.lg,
    });

    const y = drawLines(ctx, question, {
      x: -cardWidth / 2 + inset,
      y: top + inset,
      family: fonts.head,
      color: palette.foreground,
    });

    recap.options.forEach((option, index) => {
      drawOptionRow(ctx, {
        x: -cardWidth / 2 + inset,
        y: y + 44 + index * (rowHeight + rowGap),
        width: cardWidth - inset * 2,
        height: rowHeight,
      }, {
        label: option.label,
        share: option.share,
        percent: option.percent,
        dominant: option.id === recap.top.id,
      });
    });
  });

  return canvas.toBuffer('image/jpeg', JPEG_QUALITY);
};

/** Slide 3 — the only thing the post asks for: install the app. */
const renderCallToActionSlide = async (): Promise<Buffer> => {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, palette.primary);

  const iconSize = 340;
  const iconX = (CARD_WIDTH - iconSize) / 2;
  const iconY = 150;
  const iconRect = { x: iconX, y: iconY, width: iconSize, height: iconSize };

  // The icon as a store listing shows it — in its own rounded square, wearing
  // this design system's border and shadow rather than the platform's mask. It
  // is drawn on the frame the surface just laid down, then clipped to it, so
  // the artwork cannot spill over the corners.
  drawSurface(ctx, iconRect, { fill: palette.card, radius: radius['2xl'] });

  const icon = await loadImage(path.join(ASSETS_DIR, 'icon.png'));

  ctx.save();
  roundRectPath(ctx, iconRect, radius['2xl']);
  ctx.clip();
  ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
  ctx.restore();

  ctx.lineWidth = BORDER_WIDTH;
  ctx.strokeStyle = palette.foreground;
  roundRectPath(ctx, iconRect, radius['2xl']);
  ctx.stroke();

  const centerX = CARD_WIDTH / 2;

  const title = fitText(ctx, 'TÉLÉCHARGE\nSTATOWREL', {
    family: fonts.head,
    maxWidth: CONTENT_WIDTH,
    maxLines: 2,
    max: 104,
    min: 64,
    lineHeightRatio: 1.06,
  });

  let y = drawLines(ctx, title, { x: centerX, y: 600, family: fonts.head, color: palette.foreground, align: 'center' });

  ctx.font = font(fonts.sans, 36);
  const baseline = { lines: wrapText(ctx, BASELINE, CONTENT_WIDTH - 40), fontSize: 36, lineHeight: 50 };

  y = drawLines(ctx, baseline, {
    x: centerX,
    y: y + 40,
    family: fonts.sans,
    color: palette.foreground,
    align: 'center',
  });

  const buttonLabel = 'App Store · Google Play';
  const buttonHeight = 112;

  ctx.font = font(fonts.head, 40);
  const buttonWidth = Math.round(ctx.measureText(buttonLabel).width) + 96;
  const buttonY = y + 44;

  // White rather than black: the shadow under every neobrutalist surface *is*
  // black, so a black button on this yellow would print its own shadow as a
  // thicker edge and lose the offset that makes the style read.
  drawSurface(ctx, { x: centerX - buttonWidth / 2, y: buttonY, width: buttonWidth, height: buttonHeight }, {
    fill: palette.card,
    radius: radius.full,
  });

  ctx.fillStyle = palette.foreground;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(buttonLabel, centerX, buttonY + buttonHeight / 2 + 2);

  ctx.font = font(fonts.sans, 30);
  ctx.fillText(INSTAGRAM_HANDLE, centerX, CARD_HEIGHT - CARD_PADDING - 22);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  return canvas.toBuffer('image/jpeg', JPEG_QUALITY);
};

/**
 * The three slides of the morning post, in carousel order: the stat, the
 * question it answers, the app.
 *
 * All three are drawn at the same size on purpose: Instagram crops every item
 * of a carousel to the **first** one's aspect ratio, so a slide of another
 * shape would come back cut rather than letterboxed.
 */
export const renderRecapCarousel = async (recap: DailyRecap): Promise<Buffer[]> => {
  registerBrandFonts();

  return [ renderResultSlide(recap), renderQuestionSlide(recap), await renderCallToActionSlide() ];
};
