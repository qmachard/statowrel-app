export interface AlertProps {
  tone: 'error' | 'success' | 'warning';
  children: string;
}

export const Alert = ({ tone, children }: AlertProps) => (
  <p className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
    {children}
  </p>
);
