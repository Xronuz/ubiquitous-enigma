import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  _resolve: ((v: boolean) => void) | null;
  ask: (opts: ConfirmOptions) => Promise<boolean>;
  _onConfirm: () => void;
  _onCancel: () => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  title: '',
  description: undefined,
  confirmText: 'Tasdiqlash',
  cancelText: 'Bekor qilish',
  variant: 'default',
  _resolve: null,

  ask: (opts) =>
    new Promise<boolean>((resolve) => {
      set({
        open: true,
        title: opts.title,
        description: opts.description,
        confirmText: opts.confirmText ?? 'Tasdiqlash',
        cancelText: opts.cancelText ?? 'Bekor qilish',
        variant: opts.variant ?? 'default',
        _resolve: resolve,
      });
    }),

  _onConfirm: () => {
    get()._resolve?.(true);
    set({ open: false, _resolve: null });
  },

  _onCancel: () => {
    get()._resolve?.(false);
    set({ open: false, _resolve: null });
  },
}));

/** Hook: returns an async confirm() function usable in any component */
export function useConfirm() {
  return useConfirmStore((s) => s.ask);
}
