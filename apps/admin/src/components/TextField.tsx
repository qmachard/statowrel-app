import { forwardRef, type InputHTMLAttributes } from 'react';

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
}

type TextFieldProps = FieldShellProps & InputHTMLAttributes<HTMLInputElement>;

/**
 * `forwardRef` because `react-hook-form`'s `register()` hands the input its ref
 * — the field is uncontrolled, per the repo's form convention.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, hint, error, ...props }, ref) => (
    <label className="field">
      <span className="field__label">{label}</span>
      {hint ? <span className="field__hint">{hint}</span> : null}
      <input {...props} ref={ref} className="field__input" />
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  ),
);

TextField.displayName = 'TextField';
