'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

export interface SectionTab {
  id: string;
  label: string;
  roles?: string[];
}

interface SectionTabsProps {
  tabs: SectionTab[];
  defaultTab?: string;
}

export function SectionTabs({ tabs, defaultTab }: SectionTabsProps) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const { user }     = useAuthStore();

  const activeTab = searchParams.get('tab') ?? defaultTab ?? tabs[0]?.id;

  const visibleTabs = tabs.filter((tab) => {
    if (!tab.roles) return true;
    if (!user) return false;
    const effective = user.role === 'class_teacher' ? ['class_teacher', 'teacher'] : [user.role];
    return tab.roles.some((r) => effective.includes(r));
  });

  const go = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div
      className="mb-6 inline-flex items-center gap-1 overflow-x-auto no-scrollbar rounded-[18px] p-1.5"
      style={{
        background: 'rgba(0,0,0,0.04)',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {visibleTabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => go(tab.id)}
            className={cn(
              'whitespace-nowrap rounded-[14px] px-5 py-2',
              'text-[13px] font-semibold transition-all duration-200',
              active
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/40',
            )}
            style={active ? { boxShadow: '0 1px 4px rgba(0,0,0,0.10)' } : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
