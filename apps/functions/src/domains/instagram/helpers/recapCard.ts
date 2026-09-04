import path from 'node:path';

import { type SKRSContext2D, createCanvas, loadImage } from '@napi-rs/canvas';

import { DAILY_QUESTION_TIME_ZONE, PUBLICATION_HOUR } from '@statowrel/models';

import {
  BASELINE,
  BORDER_WIDTH,
  CARD_HEIGHT,
  CARD_PADDING,
  CARD_WIDTH,
  INSTAGRAM_HANDLE,
  SHADOW_OFFSET,
  fonts,
  palette,
  radius,
} from './brand';
import { ASSETS_DIR, registerBrandFonts } from './canvasFonts';
import {
  type Rect,
  clamp,
  drawLines,
  drawSurface,
  ellipsize,
  fitText,
  font,
  roundRectPath,
  textBlockHeight,
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

/** « jeudi 3 septembre », for the day the recap is about. */
const dayLabel = (date: string): string => new Intl.DateTimeFormat('fr-FR', {
  timeZone: DAILY_QUESTION_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  // Read at noon UTC rather than at midnight: a `YYYY-MM-DD` parsed as UTC
  // midnight is still the previous day in a timezone west of Greenwich, and
  // Paris is east of it in winter only.
}).format(new Date(`${date}T12:00:00Z`));

/**
 * A percentage as the card writes it — « 72 % », never « 71,8 % ».
 *
 * It is handed the whole number `recapData` apportioned rather than a share to
 * round here: the headline and the leader's own bar have to print the same
 * figure, and two roundings of one share is exactly how they stop doing that.
 */
const percentLabel = (percent: number): string => `${percent} %`;

const drawBackground = (ctx: SKRSContext2D, fill: string): void => {
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
};

/** The black pill the brand name sits in — the mark both slides open or close on. */
const drawPill = (
  ctx: SKRSContext2D,
  { x, y, label, fontSize, height }: { x: number; y: number; label: string; fontSize: number; height: number },
): number => {
  ctx.font = font(fonts.head, fontSize);

  const width = Math.round(ctx.measureText(label).width) + height;

  drawSurface(ctx, { x, y, width, height }, { fill: palette.foreground, radius: radius.full, shadow: false });

  ctx.fillStyle = palette.card;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + height / 2, y + height / 2 + 2);
  ctx.textBaseline = 'alphabetic';

  return width;
};

/**
 * The headline: the share, then « des gens sont », then the StatOwrel.
 *
 * It is handed a **box** rather than a position, and sizes itself inside it,
 * because it is the block that absorbs the layout's slack: the question above
 * it is between one and three lines and the bars below it between two and six
 * rows (`QUESTION_MIN_OPTIONS`/`QUESTION_MAX_OPTIONS`), so what is left for the
 * headline swings by a factor of two from one day to the next. Sizing it from
 * its box is what keeps the card from either overflowing on a six-option day or
 * leaving a hole on a two-option one.
 */
const drawHeadline = (ctx: SKRSContext2D, box: Rect, recap: DailyRecap): void => {
  drawSurface(ctx, box, { fill: palette.accent, radius: radius.DEFAULT });

  const innerWidth = box.width - 140;
  const centerX = box.x + box.width / 2;

  const percentSize = clamp(Math.round(box.height * 0.40), 84, 190);
  const percent = { lines: [ percentLabel(recap.top.percent) ], fontSize: percentSize, lineHeight: percentSize };

  const leadSize = clamp(Math.round(percentSize * 0.26), 28, 46);
  const lead = { lines: [ 'des gens sont' ], fontSize: leadSize, lineHeight: Math.round(leadSize * 1.3) };

  const stat = fitText(ctx, recap.top.statLabel.toUpperCase(), {
    family: fonts.head,
    maxWidth: innerWidth,
    maxLines: 2,
    max: clamp(Math.round(percentSize * 0.64), 46, 108),
    min: 36,
  });

  const total = textBlockHeight(percent) + textBlockHeight(lead) + textBlockHeight(stat);
  let y = box.y + Math.round((box.height - total) / 2);

  y = drawLines(ctx, percent, { x: centerX, y, family: fonts.head, color: palette.card, align: 'center' });
  y = drawLines(ctx, lead, { x: centerX, y, family: fonts.sans, color: palette.card, align: 'center' });
  drawLines(ctx, stat, { x: centerX, y, family: fonts.head, color: palette.primary, align: 'center' });
};

/**
 * One option as a bar whose **fill width is its share** — the label inside on
 * the left, the percentage on the right.
 *
 * The same anatomy as the app's `AnswerShareRow`, so somebody who has seen the
 * result screen recognises the post: the dominant answer takes `primary`, the
 * others `muted`, and the track underneath is the card white.
 */
const drawOptionRow = (
  ctx: SKRSContext2D,
  rect: Rect,
  { label, share, percent, dominant }: { label: string; share: number; percent: number; dominant: boolean },
): void => {
  drawSurface(ctx, rect, { fill: palette.card, radius: radius.full, shadow: false });

  ctx.save();
  roundRectPath(ctx, rect, radius.full);
  ctx.clip();
  ctx.fillStyle = dominant ? palette.primary : palette.muted;
  // A share under a couple of percent still has to read as a bar rather than as
  // a sliver of border, hence the floor: the number beside it is the truth, the
  // fill is the shape of it.
  ctx.fillRect(rect.x, rect.y, Math.max(rect.width * share, rect.height), rect.height);
  ctx.restore();

  ctx.lineWidth = BORDER_WIDTH;
  ctx.strokeStyle = palette.foreground;
  roundRectPath(ctx, rect, radius.full);
  ctx.stroke();

  const textSize = clamp(Math.round(rect.height * 0.36), 26, 40);
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
    ellipsize(ctx, label, fonts.sansMedium, textSize, rect.width - inset * 2 - percentWidth - 32),
    rect.x + inset,
    rect.y + rect.height / 2,
  );

  ctx.textBaseline = 'alphabetic';
};

/**
 * How tall each bar is, and the gap between them, for `count` options.
 *
 * The rows are what the rest of the card is laid out around, so their height is
 * decided first and from the only thing that varies: a two-option day gets
 * generous bars, a six-option day gets the tightest ones that still take a
 * 26px label. The headline then takes whatever is left.
 */
const rowMetricsFor = (count: number): { height: number; gap: number } => {
  if (count <= 3) return { height: 104, gap: 20 };
  if (count === 4) return { height: 92, gap: 20 };
  if (count === 5) return { height: 82, gap: 16 };

  return { height: 70, gap: 12 };
};

const drawFooter = (ctx: SKRSContext2D, y: number): void => {
  ctx.font = font(fonts.sans, 28);
  ctx.fillStyle = palette['muted-foreground'];
  ctx.textBaseline = 'middle';

  ctx.fillText(INSTAGRAM_HANDLE, CARD_PADDING, y);

  ctx.textAlign = 'right';
  ctx.fillText(`une question par jour, à ${PUBLICATION_HOUR}h`, CARD_WIDTH - CARD_PADDING, y);
  ctx.textAlign = 'left';

  ctx.textBaseline = 'alphabetic';
};

/** Slide 1 — the day: its question, the share that won it, and every option's bar. */
const renderResultSlide = (recap: DailyRecap): Buffer => {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, palette.background);

  const headerHeight = 68;
  const pillWidth = drawPill(ctx, {
    x: CARD_PADDING,
    y: CARD_PADDING,
    label: 'STATOWREL',
    fontSize: 30,
    height: headerHeight,
  });

  ctx.font = font(fonts.sansMedium, 30);
  ctx.fillStyle = palette['muted-foreground'];
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.fillText(
    ellipsize(ctx, dayLabel(recap.date), fonts.sansMedium, 30, CONTENT_WIDTH - pillWidth - 32),
    CARD_WIDTH - CARD_PADDING,
    CARD_PADDING + headerHeight / 2,
  );
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const question = fitText(ctx, recap.question, {
    family: fonts.head,
    maxWidth: CONTENT_WIDTH - 96,
    maxLines: 3,
    max: 58,
    min: 38,
  });

  const questionCard = {
    x: CARD_PADDING,
    y: CARD_PADDING + headerHeight + 44,
    width: CONTENT_WIDTH,
    height: textBlockHeight(question) + 80,
  };

  drawSurface(ctx, questionCard, { fill: palette.card, radius: radius.DEFAULT });
  drawLines(ctx, question, {
    x: questionCard.x + 48,
    y: questionCard.y + 40,
    family: fonts.head,
    color: palette.foreground,
  });

  const { height: rowHeight, gap: rowGap } = rowMetricsFor(recap.options.length);
  const rowsHeight = recap.options.length * rowHeight + (recap.options.length - 1) * rowGap;

  const footerY = CARD_HEIGHT - CARD_PADDING - 22;
  const rowsY = footerY - 62 - rowsHeight;

  const headlineY = questionCard.y + questionCard.height + SHADOW_OFFSET + 36;

  drawHeadline(ctx, {
    x: CARD_PADDING,
    y: headlineY,
    width: CONTENT_WIDTH,
    height: rowsY - 36 - SHADOW_OFFSET - headlineY,
  }, recap);

  recap.options.forEach((option, index) => {
    drawOptionRow(ctx, {
      x: CARD_PADDING,
      y: rowsY + index * (rowHeight + rowGap),
      width: CONTENT_WIDTH,
      height: rowHeight,
    }, {
      label: option.label,
      share: option.share,
      percent: option.percent,
      dominant: option.id === recap.top.id,
    });
  });

  drawFooter(ctx, footerY);

  return canvas.toBuffer('image/jpeg', JPEG_QUALITY);
};

/** Slide 2 — the only thing the post asks for: install the app. */
const renderCallToActionSlide = async (): Promise<Buffer> => {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, palette.primary);

  // The Android adaptive foreground, which is the only one of the three brand
  // PNGs with a transparent ground — and it frames the star at 66% of its
  // canvas, against the circle a launcher may mask it down to. So it is drawn
  // large: two thirds of 520px is the star, the rest is that framing.
  const star = await loadImage(path.join(ASSETS_DIR, 'star.png'));
  const starSize = 520;

  ctx.drawImage(star, (CARD_WIDTH - starSize) / 2, 110, starSize, starSize);

  const centerX = CARD_WIDTH / 2;

  const title = fitText(ctx, 'TÉLÉCHARGE\nSTATOWREL', {
    family: fonts.head,
    maxWidth: CONTENT_WIDTH,
    maxLines: 2,
    max: 104,
    min: 64,
    lineHeightRatio: 1.06,
  });

  let y = drawLines(ctx, title, { x: centerX, y: 660, family: fonts.head, color: palette.foreground, align: 'center' });

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

  const buttonY = y + 42;

  // White rather than black: the shadow under every neobrutalist surface *is*
  // black, so a black button on this yellow would print its own shadow as a
  // thicker edge and lose the offset that makes the style read.
  drawSurface(ctx, {
    x: centerX - buttonWidth / 2,
    y: buttonY,
    width: buttonWidth,
    height: buttonHeight,
  }, { fill: palette.card, radius: radius.full });

  ctx.fillStyle = palette.foreground;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(buttonLabel, centerX, buttonY + buttonHeight / 2 + 2);

  ctx.font = font(fonts.sans, 30);
  ctx.fillStyle = palette.foreground;
  ctx.fillText(INSTAGRAM_HANDLE, centerX, CARD_HEIGHT - CARD_PADDING - 22);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  return canvas.toBuffer('image/jpeg', JPEG_QUALITY);
};

/**
 * The two slides of the morning post, in carousel order.
 *
 * Both are drawn at the same size on purpose: Instagram crops every item of a
 * carousel to the **first** one's aspect ratio, so a second slide of another
 * shape would come back cut rather than letterboxed.
 */
export const renderRecapCarousel = async (recap: DailyRecap): Promise<Buffer[]> => {
  registerBrandFonts();

  return [ renderResultSlide(recap), await renderCallToActionSlide() ];
};
