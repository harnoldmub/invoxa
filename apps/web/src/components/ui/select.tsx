import { SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn('h-10 w-full appearance-none rounded-md border border-input bg-white px-3 pr-9 text-sm outline-none transition focus:ring-2 focus:ring-ring', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
    </div>
  );
});

Select.displayName = 'Select';
