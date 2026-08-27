import { type ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  small?: boolean;
  block?: boolean;
  /**
   * Square, icon-only. The caller owes it an `aria-label`: a glyph is `aria-hidden`,
   * so without one the button reaches a screen reader unnamed.
   */
  icon?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: '',
  secondary: 'button--secondary',
  ghost: 'button--ghost',
};

/** `forwardRef` so a popover trigger can measure itself — see `DropdownMenu`. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  small = false,
  block = false,
  icon = false,
  className,
  type = 'button',
  ...props
}, ref) => (
  <button
    {...props}
    ref={ref}
    type={type}
    className={[
      'button',
      VARIANT_CLASS[variant],
      small ? 'button--small' : '',
      block ? 'button--block' : '',
      icon ? 'button--icon' : '',
      className ?? '',
    ].filter(Boolean).join(' ')}
  />
));

Button.displayName = 'Button';
