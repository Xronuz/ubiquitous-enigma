'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Context ───────────────────────────────────────────────────────────────────
interface AccordionContextValue {
  value: string[];
  toggle: (id: string) => void;
  type: 'single' | 'multiple';
}

const AccordionContext = React.createContext<AccordionContextValue>({
  value: [],
  toggle: () => {},
  type: 'single',
});

// ── Root ──────────────────────────────────────────────────────────────────────
interface AccordionProps {
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  collapsible?: boolean;
  className?: string;
  children: React.ReactNode;
}

function Accordion({
  type = 'single',
  defaultValue,
  value: controlledValue,
  onValueChange,
  collapsible = true,
  className,
  children,
}: AccordionProps) {
  const [internalValue, setInternalValue] = React.useState<string[]>(() => {
    if (defaultValue) return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    return [];
  });

  const value = controlledValue !== undefined
    ? Array.isArray(controlledValue) ? controlledValue : [controlledValue]
    : internalValue;

  const toggle = React.useCallback((id: string) => {
    setInternalValue(prev => {
      let next: string[];
      if (type === 'single') {
        next = prev.includes(id) && collapsible ? [] : [id];
      } else {
        next = prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id];
      }
      onValueChange?.(type === 'single' ? (next[0] ?? '') : next);
      return next;
    });
  }, [type, collapsible, onValueChange]);

  return (
    <AccordionContext.Provider value={{ value, toggle, type }}>
      <div className={cn('divide-y divide-border', className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

// ── Item ──────────────────────────────────────────────────────────────────────
interface AccordionItemContextValue { id: string; isOpen: boolean }
const ItemContext = React.createContext<AccordionItemContextValue>({ id: '', isOpen: false });

interface AccordionItemProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

function AccordionItem({ value: id, className, children }: AccordionItemProps) {
  const { value } = React.useContext(AccordionContext);
  const isOpen = value.includes(id);
  return (
    <ItemContext.Provider value={{ id, isOpen }}>
      <div className={cn('border-b', className)}>
        {children}
      </div>
    </ItemContext.Provider>
  );
}

// ── Trigger ───────────────────────────────────────────────────────────────────
interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

function AccordionTrigger({ children, className, ...props }: AccordionTriggerProps) {
  const { id, isOpen } = React.useContext(ItemContext);
  const { toggle } = React.useContext(AccordionContext);
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      onClick={() => toggle(id)}
      className={cn(
        'flex w-full items-center justify-between py-3 text-sm font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180',
        className,
      )}
      data-state={isOpen ? 'open' : 'closed'}
      {...props}
    >
      {children}
      <ChevronDown
        className={cn(
          'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
          isOpen && 'rotate-180',
        )}
      />
    </button>
  );
}

// ── Content ───────────────────────────────────────────────────────────────────
interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function AccordionContent({ children, className, ...props }: AccordionContentProps) {
  const { isOpen } = React.useContext(ItemContext);
  if (!isOpen) return null;
  return (
    <div
      className={cn('pb-4 pt-0 text-sm', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
