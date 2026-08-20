import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  small?: boolean;
  block?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: '',
  secondary: 'button--secondary',
  ghost: 'button--ghost',
};

export const Button = ({
  variant = 'primary',
  small = false,
  block = false,
  className,
  type = 'button',
  ...props
}: ButtonProps) => (
  <button
    {...props}
    type={type}
    className={[
      'button',
      VARIANT_CLASS[variant],
      small ? 'button--small' : '',
      block ? 'button--block' : '',
      className ?? '',
    ].filter(Boolean).join(' ')}
  />
);
