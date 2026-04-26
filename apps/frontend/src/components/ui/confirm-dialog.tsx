'use client';

import { AlertTriangle, Trash2 } from 'lucide-react';
import { useConfirmStore } from '@/store/confirm.store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog';
import { Button } from './button';

export function ConfirmDialog() {
  const { open, title, description, confirmText, cancelText, variant, _onConfirm, _onCancel } =
    useConfirmStore();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) _onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {variant === 'destructive' ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 shrink-0">
                <Trash2 className="h-4 w-4 text-destructive" />
              </span>
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 shrink-0">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </span>
            )}
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="pl-10">{description}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={_onCancel}>
            {cancelText}
          </Button>
          <Button variant={variant === 'destructive' ? 'destructive' : 'default'} onClick={_onConfirm}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
