import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Dialog as AriaDialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { cx } from '../../utils/cx.ts';
import { defined } from '../../utils/defined.ts';
import { IconButton } from '../actions/IconButton.tsx';

export type DrawerSide = 'start' | 'end' | 'bottom';
type Slot = ReactNode | ((close: () => void) => ReactNode);

/** Literal class names per side so Tailwind can detect them. */
const SIDES: Record<DrawerSide, string> = {
  start: 'inset-y-0 start-0 h-dvh w-[min(22rem,88vw)] rounded-e-2xl border-e data-entering:animate-sheet-in-start data-exiting:animate-sheet-out-start',
  end: 'inset-y-0 end-0 h-dvh w-[min(26rem,92vw)] rounded-s-2xl border-s data-entering:animate-sheet-in-end data-exiting:animate-sheet-out-end',
  bottom: 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t data-entering:animate-sheet-in-bottom data-exiting:animate-sheet-out-bottom',
};

export interface DrawerProps {
  title: ReactNode;
  description?: ReactNode;
  children: Slot;
  footer?: Slot;
  /** `start` for navigation, `end` for details and filters, `bottom` for phone actions. */
  side?: DrawerSide;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * Panel that slides from an edge. Same focus trap, Escape and focus restoration as
 * Dialog; outside clicks close it. Bottom sheets show a grab handle as an affordance.
 */
export function Drawer({ title, description, children, footer, side = 'end', isOpen, onOpenChange }: DrawerProps) {
  const render = (slot: Slot, close: () => void) => (typeof slot === 'function' ? slot(close) : slot);
  return (
    <ModalOverlay
      {...defined({ isOpen, onOpenChange })}
      isDismissable
      className="fixed inset-0 z-(--z-modal) bg-scrim backdrop-blur-[2px] data-entering:animate-overlay-in data-exiting:animate-overlay-out"
    >
      <Modal className={cx('fixed flex flex-col border-border-subtle bg-surface-raised text-text-primary shadow-3 outline-none', SIDES[side])}>
        <AriaDialog className="flex min-h-0 flex-1 flex-col outline-none">
          {({ close }) => (
            <>
              {side === 'bottom' && <span aria-hidden="true" className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border-subtle" />}
              <div className="flex items-start gap-4 px-5 pt-5 pb-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Heading slot="title" className="text-lg font-bold">{title}</Heading>
                  {description && <p className="text-sm text-text-secondary">{description}</p>}
                </div>
                <IconButton label="Cerrar" icon={<X />} onPress={close} className="-me-2 -mt-1.5" />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">{render(children, close)}</div>
              {footer && (
                <div className="flex flex-col-reverse gap-3 border-t border-border-subtle px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
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
