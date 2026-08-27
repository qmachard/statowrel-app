import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectShellProps {
  label?: string;
  hint?: string;
  error?: string;
}

type SelectProps = SelectShellProps & SelectHTMLAttributes<HTMLSelectElement>;

/**
 * shadcn's *native* select: a real `<select>`, not a listbox rebuilt out of
 * divs. The keyboard, the type-ahead, the form association and the mobile
 * picker are the platform's; only the chevron is ours, because `appearance:
 * none` takes the browser's away along with its skin.
 *
 * The chevron is a sibling rather than a background image so it inherits
 * `currentColor` and cannot be scaled with the control's padding.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, children, className, ...props }, ref) => (
    <label className="field">
      {label ? <span className="field__label">{label}</span> : null}
      {hint ? <span className="field__hint">{hint}</span> : null}
      <span className="select">
        <select
          {...props}
          ref={ref}
          className={[ 'select__control', className ?? '' ].filter(Boolean).join(' ')}
        >
          {children}
        </select>
        <svg
          className="select__chevron"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M4 6.5 8 10.5 12 6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  ),
);

Select.displayName = 'Select';
