'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

// NProgress sozlamalari
NProgress.configure({
  minimum: 0.15,
  easing: 'ease',
  speed: 250,
  showSpinner: false,
  trickleSpeed: 200,
});

export function RouteProgress() {
  const pathname   = usePathname();
  const searchParams = useSearchParams();
  const prevUrl    = useRef<string>('');

  useEffect(() => {
    const currentUrl = pathname + searchParams.toString();

    if (prevUrl.current && prevUrl.current !== currentUrl) {
      // Navigatsiya tugadi — progress to'xtatiladi
      NProgress.done();
    }

    prevUrl.current = currentUrl;
  }, [pathname, searchParams]);

  // Link bosilganda progress boshlash uchun global click interceptor
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Faqat ichki linklar, anchor va yangi tab-lar emas
      const isInternal = href.startsWith('/') && !href.startsWith('//');
      const isNewTab   = target.getAttribute('target') === '_blank';
      const isAnchor   = href.startsWith('#');
      const isModified = e.ctrlKey || e.metaKey || e.shiftKey || e.altKey;

      if (isInternal && !isNewTab && !isAnchor && !isModified) {
        const currentUrl = window.location.pathname + window.location.search;
        const isSamePage = currentUrl === href;

        if (!isSamePage) {
          NProgress.start();
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  // Sahifa yopilayotganda tozalash
  useEffect(() => {
    return () => {
      NProgress.done();
    };
  }, []);

  return null;
}
