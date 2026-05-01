'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

/* ── Context ─────────────────────────────────────────────────────────── */
interface SheetContextValue {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** true = using new Radix-style API (SheetTrigger + SheetContent children) */
  radixMode: boolean;
}

const SheetContext = React.createContext<SheetContextValue>({
  open: false,
  onOpenChange: () => {},
  radixMode: false,
});

/* ── Props ───────────────────────────────────────────────────────────── */
export interface SheetProps {
  /** Controlled open state */
  open?: boolean;
  /** Radix-style open change (new API) */
  onOpenChange?: (v: boolean) => void;
  /** Legacy close callback (old API — Sheet renders panel directly) */
  onClose?: () => void;
  /** Legacy: which side to open from (old API) */
  side?: 'left' | 'right' | 'top' | 'bottom';
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/* ── Sheet (root) ─────────────────────────────────────────────────────
 *
 *  Old API  — pass `onClose` (+ optionally `side`): Sheet renders the
 *             overlay + panel itself and children go inside the panel.
 *
 *  New API  — pass `onOpenChange`: Sheet only provides context; you must
 *             add SheetTrigger + SheetContent children.
 */
export function Sheet({
  open: controlledOpen,
  onOpenChange,
  onClose,
  side = 'right',
  defaultOpen = false,
  children,
}: SheetProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen! : internalOpen;

  const handleChange = React.useCallback(
    (v: boolean) => {
      if (!isControlled) setInternalOpen(v);
      onOpenChange?.(v);
      if (!v) onClose?.();
    },
    [isControlled, onOpenChange, onClose],
  );

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) handleChange(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, handleChange]);

  // Lock scroll
  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const radixMode = !onClose; // new API when no legacy onClose

  // ── Legacy API: render panel here ────────────────────────────────────
  if (!radixMode) {
    if (!open) return null;

    const sideClasses: Record<string, string> = {
      left:   'left-0 top-0 h-full w-72',
      right:  'right-0 top-0 h-full w-72',
      top:    'top-0 left-0 w-full',
      bottom: 'bottom-0 left-0 w-full',
    };

    return (
      <SheetContext.Provider value={{ open, onOpenChange: handleChange, radixMode: false }}>
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => handleChange(false)}
            aria-hidden
          />
          {/* Panel */}
          <div
            className={cn(
              'fixed z-50 flex flex-col bg-background shadow-xl overflow-y-auto',
              sideClasses[side],
            )}
          >
            {/* Close button */}
            <button
              onClick={() => handleChange(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Yopish</span>
            </button>
            {children}
          </div>
        </div>
      </SheetContext.Provider>
    );
  }

  // ── New / Radix API: just provide context ──────────────────────────
  return (
    <SheetContext.Provider value={{ open, onOpenChange: handleChange, radixMode: true }}>
      {children}
    </SheetContext.Provider>
  );
}

/* ── SheetTrigger ────────────────────────────────────────────────────── */
interface SheetTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SheetTrigger({ asChild, children, className }: SheetTriggerProps) {
  const { onOpenChange } = React.useContext(SheetContext);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children as any).props?.onClick?.(e);
        onOpenChange(true);
      },
    });
  }

  return (
    <button className={className} onClick={() => onOpenChange(true)}>
      {children}
    </button>
  );
}

/* ── SheetContent ────────────────────────────────────────────────────── */
interface SheetContentProps {
  side?: 'left' | 'right' | 'top' | 'bottom';
  className?: string;
  children: React.ReactNode;
  /** Hide the auto-generated close (X) button — use when the caller renders its own header/close */
  hideClose?: boolean;
}

export function SheetContent({ side = 'right', className, children, hideClose = false }: SheetContentProps) {
  const { open, onOpenChange } = React.useContext(SheetContext);

  if (!open) return null;

  const sideClasses: Record<string, string> = {
    left:   'left-0 top-0 h-full w-72',
    right:  'right-0 top-0 h-full w-72',
    top:    'top-0 left-0 w-full',
    bottom: 'bottom-0 left-0 w-full',
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      {/* Panel */}
      <div
        className={cn(
          'fixed z-50 flex flex-col bg-background shadow-xl',
          sideClasses[side],
          className,
        )}
      >
        {/* Close button — hidden when caller manages its own close UI */}
        {!hideClose && (
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors z-10"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Yopish</span>
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

/* ── SheetHeader ─────────────────────────────────────────────────────── */
export function SheetHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-1.5 text-left', className)} {...props}>
      {children}
    </div>
  );
}

/* ── SheetTitle ──────────────────────────────────────────────────────── */
export function SheetTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props}>
      {children}
    </h2>
  );
}

/* ── SheetDescription ────────────────────────────────────────────────── */
export function SheetDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </p>
  );
}

/* ── SheetClose ──────────────────────────────────────────────────────── */
interface SheetCloseProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SheetClose({ asChild, children, className }: SheetCloseProps) {
  const { onOpenChange } = React.useContext(SheetContext);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children as any).props?.onClick?.(e);
        onOpenChange(false);
      },
    });
  }

  return (
    <button className={className} onClick={() => onOpenChange(false)}>
      {children}
    </button>
  );
}
