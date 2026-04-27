import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium',
    'ring-offset-background transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.97]',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        /* Primary CTA — emerald pill with glass glow */
        default:
          'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-600/25',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        /* Outline — glass border pill */
        outline:
          'bg-white/70 text-slate-700 border border-white/90 shadow-sm backdrop-blur-sm hover:bg-white/90 hover:shadow-md dark:bg-slate-800/60 dark:text-slate-200 dark:border-white/10 dark:hover:bg-slate-700/60',
        /* Secondary — soft tinted pill */
        secondary:
          'bg-slate-100/80 text-slate-900 backdrop-blur-sm hover:bg-slate-200/80 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-700/60',
        /* Ghost — transparent */
        ghost:
          'text-slate-600 hover:bg-white/60 hover:text-slate-900 backdrop-blur-sm dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:text-white',
        link:
          'text-emerald-600 underline-offset-4 hover:underline p-0 h-auto',
        success:
          'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500',
        warning:
          'bg-amber-500 text-white shadow-sm hover:bg-amber-400',
      },
      size: {
        default: 'h-9 px-5 py-2',
        sm:      'h-8 px-4 text-xs',
        lg:      'h-11 px-7',
        xl:      'h-12 px-9 text-base',
        icon:    'h-9 w-9',
        'icon-sm': 'h-7 w-7',
        'icon-lg': 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
