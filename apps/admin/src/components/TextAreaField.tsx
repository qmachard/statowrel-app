import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
}

type TextAreaFieldProps = FieldShellProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

/** `TextField`'s twin for anything longer than a line — same shell, same classes. */
export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, hint, error, ...props }, ref) => (
    <label className="field">
      <span className="field__label">{label}</span>
      {hint ? <span className="field__hint">{hint}</span> : null}
      <textarea {...props} ref={ref} className="field__input field__input--area" />
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  ),
);

TextAreaField.displayName = 'TextAreaField';
