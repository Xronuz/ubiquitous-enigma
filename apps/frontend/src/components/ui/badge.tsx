import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/85',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/75',
        destructive:
          'border-transparent bg-destructive/15 text-destructive border-destructive/20 dark:bg-destructive/25',
        outline:
          'border-slate-200 text-slate-700 bg-white dark:border-slate-700 dark:text-slate-200 dark:bg-slate-900',

        /* ── Semantic status variants ── */
        success:
          'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        warning:
          'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        info:
          'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        purple:
          'border-transparent bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
        rose:
          'border-transparent bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
        cyan:
          'border-transparent bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',

        /* ── Subtle tinted variants — no border (Phase 15) ── */
        'outline-success':
          'border-transparent text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40',
        'outline-warning':
          'border-transparent text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40',
        'outline-destructive':
          'border-transparent text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/40',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
