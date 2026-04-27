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
    /* iOS Segmented Control — glass pill tray */
    <div
      className="mb-5 inline-flex items-center gap-0.5 overflow-x-auto no-scrollbar rounded-full p-1"
      style={{
        background: 'rgba(0,0,0,0.05)',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {visibleTabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => go(tab.id)}
            className={cn(
              'whitespace-nowrap rounded-full px-4 py-1.5',
              'text-[13px] font-medium transition-all duration-200',
              active
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
