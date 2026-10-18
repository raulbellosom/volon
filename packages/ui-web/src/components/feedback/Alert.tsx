import type { FeedbackTone } from '@delivery/design-tokens';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../../utils/cx.ts';
import { IconButton } from '../actions/IconButton.tsx';

const TONES: Record<FeedbackTone, { icon: LucideIcon; classes: string; iconColor: string }> = {
  info: { icon: Info, classes: 'bg-feedback-info-bg border-feedback-info-border', iconColor: 'text-feedback-info-fg' },
  success: {
    icon: CircleCheck,
    classes: 'bg-feedback-success-bg border-feedback-success-border',
    iconColor: 'text-feedback-success-fg',
  },
  warning: {
    icon: TriangleAlert,
    classes: 'bg-feedback-warning-bg border-feedback-warning-border',
    iconColor: 'text-feedback-warning-fg',
  },
  danger: {
    icon: CircleAlert,
    classes: 'bg-feedback-danger-bg border-feedback-danger-border',
    iconColor: 'text-feedback-danger-fg',
  },
};

export interface AlertProps {
  tone?: FeedbackTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Buttons or links to resolve the situation. */
  actions?: ReactNode;
  /** Shows a close button; omit for messages that must stay visible. */
  onDismiss?: () => void;
  /**
   * `polite` or `assertive` announce the message when it appears dynamically. Leave `off`
   * for messages rendered with the page so screen readers do not repeat them.
   */
  live?: 'off' | 'polite' | 'assertive';
  className?: string;
}

/** Inline message about the state of a page, form or process. */
export function Alert({ tone = 'info', title, children, actions, onDismiss, live = 'off', className }: AlertProps) {
  const { icon: Icon, classes, iconColor } = TONES[tone];
  const role = live === 'assertive' ? 'alert' : live === 'polite' ? 'status' : undefined;
  return (
    <div role={role} className={cx('flex gap-3 rounded-lg border p-4 text-text-primary', classes, className)}>
      <Icon aria-hidden="true" className={cx('mt-0.5 size-5 shrink-0', iconColor)} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className="text-md font-semibold">{title}</p>}
        {children && <div className="text-sm text-text-primary">{children}</div>}
        {actions && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
      </div>
      {onDismiss && (
        <IconButton label="Cerrar aviso" size="sm" icon={<X />} onPress={onDismiss} className="-me-2 -mt-2" />
      )}
    </div>
  );
}
