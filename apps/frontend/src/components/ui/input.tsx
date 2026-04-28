import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-xl text-sm',
        'bg-white border border-slate-200',
        'px-4 py-2',
        'shadow-xs',
        'transition-all duration-150',
        'placeholder:text-slate-400 dark:placeholder:text-slate-500',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400',
        'hover:border-slate-300',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
        'dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
