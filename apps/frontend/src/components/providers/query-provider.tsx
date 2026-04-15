'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,  // 1 daqiqa → 5 daqiqa: sahifalar arasi qayta yuklamaslik
            gcTime:   10 * 60 * 1000,  // default 5 daqiqa → 10 daqiqa: cache uzoqroq saqlansin
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: 'always',
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
