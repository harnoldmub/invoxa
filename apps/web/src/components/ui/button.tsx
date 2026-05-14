import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  size?: 'sm' | 'md' | 'icon';
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'default', size = 'md', ...props }, ref) => {
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    ghost: 'hover:bg-muted text-foreground',
    outline: 'border border-border bg-white hover:bg-muted',
    secondary: 'bg-accent text-accent-foreground hover:bg-accent/80',
  };
  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    icon: 'h-9 w-9 p-0',
  };
  return <button ref={ref} className={cn('inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50', variants[variant], sizes[size], className)} {...props} />;
});

Button.displayName = 'Button';
