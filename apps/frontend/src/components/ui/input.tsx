import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-full text-sm',
        // Glass surface
        'bg-white/65 backdrop-blur-sm',
        'border border-white/85',
        'px-4 py-2',
        // Shadow
        'shadow-[0_2px_8px_rgba(0,0,0,0.05)]',
        'transition-all duration-150',
        'placeholder:text-slate-400 dark:placeholder:text-slate-500',
        // Focus — emerald ring
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-400',
        'hover:border-white/95 hover:shadow-md',
        // File
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50/50',
        // Dark mode
        'dark:bg-slate-800/50 dark:border-white/10 dark:hover:border-white/20',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
