'use client';

/**
 * Xedu Premium UI System
 * Shared building blocks for every dashboard page.
 * DNA: Linear + Stripe + Notion — white, clean, emerald accents.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

// ─── Design tokens ────────────────────────────────────────────────────────────
export const DS = {
  primary:      '#0F7B53',
  primaryLight: '#DDF5EA',
  text:         '#111827',
  muted:        '#6B7280',
  border:       'rgba(0,0,0,0.05)',
  shadow:       '0 10px 30px rgba(0,0,0,0.04)',
  bg:           '#F7F8F8',
} as const;

// ─── PageShell ────────────────────────────────────────────────────────────────
/** Root wrapper for every page — consistent top padding + vertical stack */
export function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-6 pb-10', className)}>
      {children}
    </div>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold tracking-tight leading-tight truncate" style={{ color: DS.text }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] mt-0.5 font-medium" style={{ color: DS.muted }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

// ─── PCard ────────────────────────────────────────────────────────────────────
/** Premium white card — same DNA as dashboard cards */
interface PCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  hoverable?: boolean;
  onClick?: () => void;
}
export function PCard({ children, className, style, padding = 'md', hoverable, onClick }: PCardProps) {
  const pad = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-7' }[padding];
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-[24px] bg-white',
        pad,
        hoverable && 'cursor-pointer transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_20px_48px_rgba(0,0,0,0.08)]',
        className,
      )}
      style={{ border: '1px solid rgba(0,0,0,0.04)', boxShadow: DS.shadow, ...style }}
    >
      {children}
    </div>
  );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────
interface FilterBarProps {
  search?: string;
  onSearch?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}
export function FilterBar({ search, onSearch, searchPlaceholder = 'Qidiruv...', filters, actions, className }: FilterBarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {onSearch !== undefined && (
        <div className="relative flex-1 min-w-[200px] max-w-[360px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search ?? ''}
            onChange={e => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-[42px] pl-10 pr-4 text-[13px] rounded-[14px] outline-none transition-all"
            style={{
              background: '#F7F8F8',
              border: '1px solid rgba(0,0,0,0.06)',
              color: DS.text,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(15,123,83,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,123,83,0.08)'; }}
            onBlur={e =>  { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)';   e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>
      )}
      {filters}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Btn ─────────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  asChild?: boolean;
}
export function Btn({
  variant = 'secondary', size = 'md', icon, loading, children, className, disabled, ...rest
}: BtnProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-[14px] transition-all duration-150 select-none';
  const sizes = { sm: 'h-8 px-3 text-[12px]', md: 'h-[42px] px-4 text-[13px]', lg: 'h-12 px-6 text-[14px]' };
  const variants: Record<BtnVariant, string> = {
    primary:   'bg-[#0F7B53] text-white hover:bg-[#0d6b48] active:scale-[0.98] shadow-sm',
    secondary: 'bg-white text-slate-700 border border-[rgba(0,0,0,0.08)] hover:bg-slate-50 hover:border-[rgba(0,0,0,0.12)]',
    ghost:     'bg-transparent text-slate-600 hover:bg-slate-100',
    danger:    'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
    soft:      'bg-[#DDF5EA] text-[#0F7B53] hover:bg-[#c8f0dc]',
  };
  return (
    <button
      className={cn(base, sizes[size], variants[variant], (disabled || loading) && 'opacity-50 cursor-not-allowed', className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading
        ? <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        : icon}
      {children}
    </button>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'violet';
const STATUS_STYLES: Record<StatusVariant, { bg: string; text: string }> = {
  success: { bg: '#DDF5EA', text: '#0F7B53' },
  warning: { bg: '#FEF3C7', text: '#D97706' },
  danger:  { bg: '#FEE2E2', text: '#DC2626' },
  info:    { bg: '#DBEAFE', text: '#2563EB' },
  neutral: { bg: '#F3F4F6', text: '#6B7280' },
  violet:  { bg: '#EDE9FE', text: '#7C3AED' },
};
interface StatusBadgeProps {
  variant?: StatusVariant;
  children: React.ReactNode;
  className?: string;
}
export function StatusBadge({ variant = 'neutral', children, className }: StatusBadgeProps) {
  const s = STATUS_STYLES[variant];
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide', className)}
      style={{ background: s.bg, color: s.text }}
    >
      {children}
    </span>
  );
}

// ─── TableShell ───────────────────────────────────────────────────────────────
/** Wraps a standard HTML table with premium rounded container */
export function TableShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <PCard padding="none" className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          {children}
        </table>
      </div>
    </PCard>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr
        className="border-b"
        style={{ borderColor: 'rgba(0,0,0,0.05)', background: '#FAFAFA' }}
      >
        {children}
      </tr>
    </thead>
  );
}

export function TH({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn('px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.1em] whitespace-nowrap', className)}
      style={{ color: DS.muted }}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b transition-colors duration-100',
        onClick && 'cursor-pointer',
        className,
      )}
      style={{ borderColor: 'rgba(0,0,0,0.04)' }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = '#FAFBFA'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
    >
      {children}
    </tr>
  );
}

export function TD({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={cn('px-5 py-3.5 align-middle', className)} style={{ color: DS.text }}>
      {children}
    </td>
  );
}

// ─── Avatar initials ──────────────────────────────────────────────────────────
const AV_COLORS = [
  ['#DDF5EA','#0F7B53'],['#DBEAFE','#2563EB'],['#EDE9FE','#7C3AED'],
  ['#FEF3C7','#D97706'],['#CFFAFE','#0891B2'],['#FFE4E6','#E11D48'],
];
export function AvatarCell({ name, subtitle, size = 36 }: { name: string; subtitle?: string; size?: number }) {
  const idx  = name.charCodeAt(0) % AV_COLORS.length;
  const [bg, fg] = AV_COLORS[idx];
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <div
        className="rounded-xl shrink-0 flex items-center justify-center text-[12px] font-bold"
        style={{ width: size, height: size, background: bg, color: fg }}
      >
        {initials}
      </div>
      <div className="min-w-0">
        <p className="font-semibold truncate text-[13px]" style={{ color: DS.text }}>{name}</p>
        {subtitle && <p className="text-[11px] truncate mt-0.5" style={{ color: DS.muted }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── EmptyCard ────────────────────────────────────────────────────────────────
interface EmptyCardProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}
export function EmptyCard({ icon, title, description, action }: EmptyCardProps) {
  return (
    <PCard className="flex flex-col items-center justify-center py-16 text-center gap-3">
      {icon
        ? <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-1" style={{ background: DS.primaryLight }}>
            <span style={{ color: DS.primary }}>{icon}</span>
          </div>
        : <Inbox className="h-10 w-10 opacity-25 mb-1" />
      }
      <p className="font-semibold text-[15px]" style={{ color: DS.text }}>{title}</p>
      {description && <p className="text-[13px] max-w-xs" style={{ color: DS.muted }}>{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </PCard>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number;
  total: number;
  perPage: number;
  onPage: (n: number) => void;
}
export function Pagination({ page, total, perPage, onPage }: PaginationProps) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  const from = (page - 1) * perPage + 1;
  const to   = Math.min(page * perPage, total);
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
      <p className="text-[12px] font-medium" style={{ color: DS.muted }}>
        {from}–{to} / {total} ta
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="h-8 w-8 rounded-xl flex items-center justify-center transition-colors hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" style={{ color: DS.muted }} />
        </button>
        {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
          const p = pages <= 7 ? i + 1 : i < 3 ? i + 1 : i === 3 ? page : i === 4 ? pages - 2 : i === 5 ? pages - 1 : pages;
          return (
            <button
              key={p}
              onClick={() => onPage(p)}
              className="h-8 min-w-[32px] px-2 rounded-xl text-[12px] font-semibold transition-colors"
              style={p === page
                ? { background: DS.primaryLight, color: DS.primary }
                : { color: DS.muted, background: 'transparent' }
              }
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="h-8 w-8 rounded-xl flex items-center justify-center transition-colors hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" style={{ color: DS.muted }} />
        </button>
      </div>
    </div>
  );
}

// ─── SectionCard ─────────────────────────────────────────────────────────────
/** Card with a title bar and optional action */
interface SectionCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}
export function SectionCard({ title, subtitle, action, children, className }: SectionCardProps) {
  return (
    <PCard padding="none" className={className}>
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
        <div>
          <p className="font-bold text-[14px]" style={{ color: DS.text }}>{title}</p>
          {subtitle && <p className="text-[12px] mt-0.5" style={{ color: DS.muted }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div>{children}</div>
    </PCard>
  );
}

// ─── StatMini ────────────────────────────────────────────────────────────────
interface StatMiniProps { label: string; value: string | number; color?: string; bg?: string }
export function StatMini({ label, value, color = DS.text, bg = '#F7F8F8' }: StatMiniProps) {
  return (
    <div className="rounded-2xl px-4 py-3 text-center" style={{ background: bg }}>
      <p className="text-[22px] font-black leading-none tracking-tight" style={{ color }}>{value}</p>
      <p className="text-[11px] font-semibold mt-1 uppercase tracking-wide" style={{ color: DS.muted }}>{label}</p>
    </div>
  );
}

// ─── IconBubble ──────────────────────────────────────────────────────────────
export function IconBubble({ icon, bg, color, size = 40 }: { icon: React.ReactNode; bg: string; color: string; size?: number }) {
  return (
    <div
      className="rounded-2xl flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: bg, color }}
    >
      {icon}
    </div>
  );
}
