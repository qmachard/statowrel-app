import { type ReactNode, useEffect, useRef } from 'react';

import { Button } from './Button';
import { EllipsisIcon } from './icons';

/** Gap between the trigger and the panel, and the margin the panel keeps off the viewport. */
const OFFSET = 6;
const EDGE = 8;

export interface DropdownMenuProps {
  /** Names the trigger for a screen reader — the glyph on it is `aria-hidden`. */
  label: string;
  /** Buttons. Any click inside closes the panel, the way activating an item should. */
  children: ReactNode;
}

/**
 * The « … » of a data-table row: shadcn puts the secondary actions behind one,
 * and so does this — on the platform's Popover API rather than on Radix.
 *
 * `popover="auto"` is what buys the two behaviours a hand-rolled panel has to
 * reimplement: light dismiss (a click outside, Escape) and the **top layer**.
 * The second one matters here more than anywhere: the panel hangs inside
 * `.table-wrap`, whose `overflow-x: auto` would clip anything merely
 * positioned. The attribute is set from a ref rather than in JSX because React
 * 18's typings predate it.
 *
 * Placement is computed on open instead of through CSS anchor positioning,
 * which is not on every browser yet — the top layer sits in viewport
 * coordinates, so a `fixed` panel only needs the trigger's rect.
 *
 * No `role="menu"`: that pattern owes the user arrow-key roving and type-ahead,
 * and a disclosure holding two buttons owes them Tab, Escape and a name — which
 * is what this is.
 */
export const DropdownMenu = ({ label, children }: DropdownMenuProps) => {
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (panel.current) {
      panel.current.popover = 'auto';
    }
  }, []);

  const place = () => {
    const element = panel.current;
    const button = trigger.current;

    if (!element || !button) {
      return;
    }

    const anchor = button.getBoundingClientRect();
    const { width, height } = element.getBoundingClientRect();
    const below = anchor.bottom + OFFSET;
    // Flipped above the trigger when it would otherwise run off the bottom.
    const top = below + height > window.innerHeight ? anchor.top - height - OFFSET : below;

    element.style.left = `${Math.max(EDGE, Math.min(anchor.right - width, window.innerWidth - width - EDGE))}px`;
    element.style.top = `${Math.max(EDGE, top)}px`;
  };

  const toggle = () => {
    const element = panel.current;

    if (!element) {
      return;
    }

    if (element.matches(':popover-open')) {
      element.hidePopover();

      return;
    }

    // Shown first, measured second: a hidden popover has no box to measure.
    element.showPopover();
    place();
    element.querySelector('button')?.focus();
  };

  return (
    <>
      <Button
        ref={trigger}
        variant="ghost"
        small
        icon
        aria-label={label}
        aria-haspopup="true"
        onClick={toggle}
      >
        <EllipsisIcon />
      </Button>
      <div
        ref={panel}
        className="menu"
        aria-label={label}
        onClick={() => panel.current?.hidePopover()}
        // Tabbing out of a light-dismiss popover leaves it open, so focus
        // leaving the panel closes it too — `relatedTarget` is null on the
        // blur that a click inside causes, which the handler above owns.
        onBlur={(event) => {
          if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) {
            panel.current?.hidePopover();
          }
        }}
      >
        {children}
      </div>
    </>
  );
};
