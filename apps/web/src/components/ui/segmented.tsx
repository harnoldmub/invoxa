import { cn } from '../../lib/utils';

type SegmentedProps<T extends string> = {
  value: T;
  options: T[];
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="inline-flex rounded-md border border-border bg-muted p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn('h-8 rounded-sm px-3 text-sm font-medium transition', value === option ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
