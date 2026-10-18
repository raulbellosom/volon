import { X } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Dialog as AriaDialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { cx } from '../../utils/cx.ts';
import { defined } from '../../utils/defined.ts';
import { IconButton } from '../actions/IconButton.tsx';
import { IconChip, type IconChipTone } from '../content/IconChip.tsx';

export { DialogTrigger } from 'react-aria-components';

export type DialogSize = 'sm' | 'md' | 'lg';
type Slot = ReactNode | ((close: () => void) => ReactNode);

const SIZES: Record<DialogSize, string> = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

/** Overlay: bottom-aligned sheet on phones, centered on larger screens. */
const OVERLAY = cx(
  'fixed inset-0 z-(--z-modal) flex items-end justify-center bg-scrim p-3 backdrop-blur-[2px] sm:items-center sm:p-6',
  'data-entering:animate-overlay-in data-exiting:animate-overlay-out',
);

const PANEL = cx(
  'flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-2xl border border-border-subtle',
  'bg-surface-raised text-text-primary shadow-3 outline-none',
  'data-entering:animate-modal-in data-exiting:animate-modal-out',
);

export interface DialogProps {
  title: ReactNode;
  description?: ReactNode;
  /** Icon that represents the action (Pencil to edit, Store for a branch…). */
  icon?: ReactNode;
  iconTone?: IconChipTone;
  /** Body; a function receives `close` for in-content actions. */
  children: Slot;
  /** Action row; buttons stack full-width on phones. */
  footer?: Slot;
  size?: DialogSize;
  /** Close on outside click; Escape always closes unless `role` is `alertdialog`. */
  isDismissable?: boolean;
  role?: 'dialog' | 'alertdialog';
  hideCloseButton?: boolean;
  /** Controlled mode when not wrapped in a DialogTrigger. */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

/** Modal dialog: traps focus, restores it to the trigger on close and locks page scroll. */
export function Dialog({
  title,
  description,
  icon,
  iconTone,
  children,
  footer,
  size = 'md',
  isDismissable = true,
  role = 'dialog',
  hideCloseButton,
  isOpen,
  onOpenChange,
}: DialogProps) {
  const descriptionId = useId();
  const render = (slot: Slot, close: () => void) => (typeof slot === 'function' ? slot(close) : slot);
  return (
    <ModalOverlay
      {...defined({ isOpen, onOpenChange })}
      isDismissable={isDismissable && role === 'dialog'}
      isKeyboardDismissDisabled={role === 'alertdialog'}
      className={OVERLAY}
    >
      <Modal className={cx(PANEL, SIZES[size])}>
        <AriaDialog role={role} {...defined({ 'aria-describedby': description ? descriptionId : undefined })} className="flex min-h-0 flex-1 flex-col outline-none">
          {({ close }) => (
            <>
              <div className="flex items-start gap-4 px-6 pt-6">
                {icon && <IconChip icon={icon} size="lg" {...(iconTone ? { tone: iconTone } : {})} />}
                <div className="flex min-w-0 flex-1 flex-col gap-1 self-center">
                  <Heading slot="title" className="text-xl font-bold">{title}</Heading>
                  {description && <p id={descriptionId} className="text-sm text-text-secondary">{description}</p>}
                </div>
                {!hideCloseButton && <IconButton label="Cerrar" icon={<X />} onPress={close} className="-me-2 -mt-2" />}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 text-md">{render(children, close)}</div>
              {footer && (
                <div className="flex flex-col-reverse gap-3 border-t border-border-subtle px-6 py-4 sm:flex-row sm:justify-end">
                  {render(footer, close)}
                </div>
              )}
            </>
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
