/**
 * The handful of glyphs the interface needs, inline rather than from a package:
 * they inherit `currentColor` and the button's own size, and nothing here is
 * worth a dependency.
 */
const iconProps = {
  viewBox: '0 0 16 16',
  width: 16,
  height: 16,
  'aria-hidden': true,
  focusable: false,
} as const;

export const PencilIcon = () => (
  <svg {...iconProps}>
    <path
      d="M11.2 1.9a1.4 1.4 0 0 1 2 2l-7.3 7.3-2.7.7.7-2.7 7.3-7.3ZM2.5 14.2h11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const EllipsisVerticalIcon = () => (
  <svg {...iconProps}>
    <circle cx="8" cy="3" r="1.5" fill="currentColor" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    <circle cx="8" cy="13" r="1.5" fill="currentColor" />
  </svg>
);
