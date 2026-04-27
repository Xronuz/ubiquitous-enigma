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
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const { user }   = useAuthStore();

  const activeTab = searchParams.get('tab') ?? defaultTab ?? tabs[0]?.id;

  const visibleTabs = tabs.filter((tab) => {
    if (!tab.roles) return true;
    if (!user) return false;
    const effective = user.role === 'class_teacher'
      ? ['class_teacher', 'teacher']
      : [user.role];
    return tab.roles.some((r) => effective.includes(r));
  });

  const go = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="mb-5 flex items-center gap-1 overflow-x-auto no-scrollbar rounded-full p-1 w-fit max-w-full"
      style={{ background: 'rgba(15,61,46,0.07)' }}
    >
      {visibleTabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => go(tab.id)}
            className={cn(
              'flex items-center whitespace-nowrap rounded-full px-4 py-1.5',
              'text-[13.5px] font-medium transition-all duration-200',
              active
                ? 'text-white shadow-[0_2px_14px_rgba(34,197,94,0.38)]'
                : 'text-slate-500 hover:text-[#166534] hover:bg-[#22c55e]/10',
            )}
            style={active ? {
              background: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)',
            } : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
