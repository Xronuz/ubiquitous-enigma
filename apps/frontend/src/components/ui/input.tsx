import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        // Base — h-10 matches Select/Button for aligned form rows
        'flex h-10 w-full rounded-lg text-sm',
        // Surface — premium white on slate canvas
        'bg-white dark:bg-slate-900 px-3.5 py-2',
        // Border — slate-200 for visibility on #EEF0F6
        'border border-slate-200 dark:border-slate-700',
        // Shadow — soft pill (below card in hierarchy)
        'shadow-pill',
        // Transitions
        'transition-all duration-150',
        // Placeholder
        'placeholder:text-slate-400 dark:placeholder:text-slate-500',
        // Focus ring — ring-2 blue with tight offset
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500',
        // Hover
        'hover:border-slate-300 dark:hover:border-slate-600',
        // File input
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        // Ring offset
        'ring-offset-background',
        // Disabled
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
