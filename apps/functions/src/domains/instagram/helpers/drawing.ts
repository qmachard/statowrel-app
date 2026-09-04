import type { SKRSContext2D } from '@napi-rs/canvas';

import { BORDER_WIDTH, SHADOW_OFFSET, palette } from './brand';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A rounded-rectangle path, clamped so a `full` radius on a short row draws a
 * pill instead of overshooting into a bowtie.
 *
 * Hand-rolled rather than `ctx.roundRect`: the clamp is the point, and the
 * DOM method takes the radius as given.
 */
export const roundRectPath = (ctx: SKRSContext2D, { x, y, width, height }: Rect, radius: number): void => {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
};

/**
 * The one surface this design system has: a flat fill, a thick black border and
 * a hard offset shadow drawn as a **solid black copy underneath** — never a
 * blur.
 *
 * That is what makes it neobrutalism rather than a card with a drop shadow, and
 * it is also why `ctx.shadowBlur` is never used here: a blurred edge under a
 * rounded corner is exactly the mush `apps/app/src/design/shadows.ts` moved to
 * CSS `boxShadow` to avoid.
 */
export const drawSurface = (
  ctx: SKRSContext2D,
  rect: Rect,
  { fill, radius, shadow = true }: { fill: string; radius: number; shadow?: boolean },
): void => {
  if (shadow) {
    ctx.fillStyle = palette.foreground;
    roundRectPath(ctx, { ...rect, x: rect.x + SHADOW_OFFSET, y: rect.y + SHADOW_OFFSET }, radius);
    ctx.fill();
  }

  ctx.fillStyle = fill;
  roundRectPath(ctx, rect, radius);
  ctx.fill();

  ctx.lineWidth = BORDER_WIDTH;
  ctx.strokeStyle = palette.foreground;
  ctx.stroke();
};

export const font = (family: string, size: number): string => `${size}px "${family}"`;

/**
 * Greedy word wrap against a pixel width, honouring the `\n` already in the text.
 *
 * A word longer than the line is left to overflow rather than hyphenated: at
 * these sizes that only happens to a typo, and a broken word reads as a
 * rendering bug where an overflow reads as the typo it is.
 */
export const wrapText = (ctx: SKRSContext2D, text: string, maxWidth: number): string[] => (
  text.split('\n').flatMap((paragraph) => paragraph.split(/\s+/).filter((word) => word !== '').reduce<string[]>(
    (lines, word) => {
      const current = lines[lines.length - 1];

      if (current === undefined) {
        return [ word ];
      }

      const candidate = `${current} ${word}`;

      if (ctx.measureText(candidate).width <= maxWidth) {
        lines[lines.length - 1] = candidate;

        return lines;
      }

      lines.push(word);

      return lines;
    },
    [],
  ))
);

export interface FittedText {
  lines: string[];
  fontSize: number;
  lineHeight: number;
}

/**
 * The largest size, walking down from `max`, at which `text` fits `maxLines`
 * lines of `maxWidth`.
 *
 * A question is between one word and 120 characters (`QUESTION_LABEL_MAX_LENGTH`)
 * and a StatOwrel between one word and 30, so nothing here can be laid out at a
 * fixed size: the same slide has to hold « Ton dentifrice, tu le presses… » and
 * a question three times as long. Falls back to `min` and lets the text overflow
 * its box rather than truncating — a cut question is a post nobody understands.
 */
export const fitText = (
  ctx: SKRSContext2D,
  text: string,
  { family, maxWidth, maxLines, max, min, step = 2, lineHeightRatio = 1.14 }: {
    family: string;
    maxWidth: number;
    maxLines: number;
    max: number;
    min: number;
    step?: number;
    lineHeightRatio?: number;
  },
): FittedText => {
  for (let size = max; size >= min; size -= step) {
    ctx.font = font(family, size);

    const lines = wrapText(ctx, text, maxWidth);

    if (lines.length <= maxLines) {
      return { lines, fontSize: size, lineHeight: Math.round(size * lineHeightRatio) };
    }
  }

  ctx.font = font(family, min);

  return { lines: wrapText(ctx, text, maxWidth), fontSize: min, lineHeight: Math.round(min * lineHeightRatio) };
};

/** Draws a fitted block from its top edge, and returns the y just past it. */
export const drawLines = (
  ctx: SKRSContext2D,
  { lines, fontSize, lineHeight }: FittedText,
  { x, y, family, color, align = 'left' }: {
    x: number;
    y: number;
    family: string;
    color: string;
    align?: 'left' | 'center';
  },
): number => {
  ctx.font = font(family, fontSize);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';

  lines.forEach((line, index) => {
    // The first baseline sits about 0.78 of an em below the block's top edge —
    // close enough to a cap height for these two families, and the reason every
    // block below can be positioned by its top rather than by a baseline.
    ctx.fillText(line, x, y + Math.round(fontSize * 0.78) + index * lineHeight);
  });

  ctx.textAlign = 'left';

  return y + lines.length * lineHeight;
};

export const textBlockHeight = ({ lines, lineHeight }: FittedText): number => lines.length * lineHeight;

/**
 * `text` at `family`/`size`, cut with an ellipsis if it does not fit `maxWidth`.
 *
 * The opposite call from `fitText`'s, and deliberately: a question is the post,
 * so it shrinks rather than gets cut, while an option label sits inside a bar
 * whose width *is* the statistic — shrinking one label would either shrink them
 * all or leave the rows in mismatched type.
 */
export const ellipsize = (ctx: SKRSContext2D, text: string, family: string, size: number, maxWidth: number): string => {
  ctx.font = font(family, size);

  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  let cut = text;

  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }

  return `${cut.trimEnd()}…`;
};

export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
