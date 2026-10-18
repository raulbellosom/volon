import { CircleHelp, TriangleAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { defined } from '../../utils/defined.ts';
import { Button } from '../actions/Button.tsx';
import { Dialog } from './Dialog.tsx';

export interface AlertDialogProps {
  title: ReactNode;
  /** What will happen and whether it can be undone. */
  children: ReactNode;
  /** Verb that names the action («Cancelar envío»), never a bare «Sí». */
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  /** Defaults to a warning for `danger` and a question mark otherwise. */
  icon?: ReactNode;
  /** May return a promise; the dialog stays open and pending until it resolves. */
  onConfirm: () => void | Promise<void>;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * Confirmation pattern for consequential actions. Uses `alertdialog`, cannot be dismissed
 * by clicking outside, and keeps the safe choice as the first focusable action.
 */
export function AlertDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'default',
  icon,
  onConfirm,
  isOpen,
  onOpenChange,
}: AlertDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const isDanger = tone === 'danger';

  async function confirm(close: () => void) {
    setIsPending(true);
    try {
      await onConfirm();
      close();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog
      role="alertdialog"
      size="sm"
      title={title}
      icon={icon ?? (isDanger ? <TriangleAlert /> : <CircleHelp />)}
      iconTone={isDanger ? 'danger' : 'brand'}
      hideCloseButton
      {...defined({ isOpen, onOpenChange })}
      footer={(close) => (
        <>
          <Button variant="ghost" isDisabled={isPending} onPress={close}>{cancelLabel}</Button>
          <Button variant={isDanger ? 'danger' : 'primary'} isPending={isPending} onPress={() => void confirm(close)}>
            {confirmLabel}
          </Button>
        </>
      )}
    >
      <div className="text-text-secondary">{children}</div>
    </Dialog>
  );
}
