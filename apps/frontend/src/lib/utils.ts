import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'UZS') {
  if (currency === 'UZS') {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  }
  return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency }).format(amount);
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }).format(new Date(date));
}

export function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    school_admin: 'Direktor',
    vice_principal: 'Mudir o\'rinbosari',
    teacher: 'O\'qituvchi',
    class_teacher: 'Sinf rahbari',
    accountant: 'Moliyachi',
    librarian: 'Kutubxonachi',
    student: 'O\'quvchi',
    parent: 'Ota-ona',
  };
  return labels[role] ?? role;
}

export function getAttendanceLabel(status: string): string {
  const labels: Record<string, string> = {
    present: 'Keldi',
    absent: 'Kelmadi',
    late: 'Kechikdi',
    excused: 'Uzrli',
  };
  return labels[status] ?? status;
}

export function getGradeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    homework: 'Uy ishi',
    classwork: 'Sinf ishi',
    test: 'Test',
    exam: 'Imtihon',
    quarterly: 'Choraklik',
    final: 'Yakuniy',
  };
  return labels[type] ?? type;
}

export function getScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return '#94a3b8';
  if (score >= 90) return '#22c55e';
  if (score >= 70) return '#84cc16';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

export function getScoreColorClass(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'text-slate-400';
  if (score >= 90) return 'text-emerald-500';
  if (score >= 70) return 'text-lime-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-red-500';
}
