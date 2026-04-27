'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface HeaderActionsCtx {
  actions: ReactNode;
  setActions: (a: ReactNode) => void;
}

const HeaderActionsContext = createContext<HeaderActionsCtx>({
  actions: null,
  setActions: () => {},
});

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActionsState] = useState<ReactNode>(null);
  const setActions = useCallback((a: ReactNode) => setActionsState(a), []);
  return (
    <HeaderActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </HeaderActionsContext.Provider>
  );
}

/** Use inside any page to inject buttons into the top navbar */
export function usePageActions() {
  return useContext(HeaderActionsContext);
}

/** Renders whatever the current page registered as its primary actions */
export function HeaderActionsSlot() {
  const { actions } = useContext(HeaderActionsContext);
  if (!actions) return null;
  return <div className="flex items-center gap-2">{actions}</div>;
}
