import { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type SwitchProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  checked: boolean;
};

export function Switch({ checked, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn('relative h-6 w-11 rounded-full border transition-colors', checked ? 'border-primary bg-primary' : 'border-border bg-muted', className)}
      {...props}
    >
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
}
