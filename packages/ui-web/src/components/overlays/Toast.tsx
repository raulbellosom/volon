import type { FeedbackTone } from '@delivery/design-tokens';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import {
  Button as AriaButton,
  Text,
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as AriaToastContent,
  UNSTABLE_ToastQueue as AriaToastQueue,
  UNSTABLE_ToastRegion as AriaToastRegion,
} from 'react-aria-components';
import { cx } from '../../utils/cx.ts';

/*
 * React Aria's toast API is still marked UNSTABLE; it is wrapped here so a future
 * migration only touches this file. Apps use `toast()` and `<ToastRegion />`.
 */

export interface ToastContent {
  title: string;
  description?: string;
  tone?: FeedbackTone;
}

export interface ToastOptions {
  /** Milliseconds before auto-dismiss; omit for messages the user must close. */
  timeout?: number;
}

const queue = new AriaToastQueue<ToastContent>({ maxVisibleToasts: 4 });

/** Shows a toast. Default 5 s timeout; errors stay until closed so they are not missed. */
export function toast(content: ToastContent, { timeout }: ToastOptions = {}): string {
  const resolvedTimeout = timeout ?? (content.tone === 'danger' ? undefined : 5000);
  return queue.add(content, resolvedTimeout ? { timeout: resolvedTimeout } : {});
}

export function dismissToast(key: string): void {
  queue.close(key);
}

const ICONS: Record<FeedbackTone, { icon: LucideIcon; color: string }> = {
  info: { icon: Info, color: 'text-feedback-info-fg' },
  success: { icon: CircleCheck, color: 'text-feedback-success-fg' },
  warning: { icon: TriangleAlert, color: 'text-feedback-warning-fg' },
  danger: { icon: CircleAlert, color: 'text-feedback-danger-fg' },
};

/** Mount once near the root of each app. Bottom-center on phones, bottom-right on desktop. */
export function ToastRegion() {
  return (
    <AriaToastRegion
      queue={queue}
      className={cx(
        'fixed inset-x-3 bottom-3 z-(--z-toast) flex flex-col-reverse gap-2 outline-none',
        'sm:inset-x-auto sm:end-6 sm:bottom-6 sm:w-96',
      )}
    >
      {({ toast: queued }) => {
        const { title, description, tone = 'info' } = queued.content;
        const { icon: Icon, color } = ICONS[tone];
        return (
          <AriaToast
            toast={queued}
            className={cx(
              'flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-raised p-4 text-text-primary shadow-3',
              'outline-none data-focus-visible:focus-ring animate-toast-in',
            )}
          >
            <Icon aria-hidden="true" className={cx('mt-0.5 size-5 shrink-0', color)} />
            <AriaToastContent className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Text slot="title" className="text-md font-semibold">{title}</Text>
              {description && <Text slot="description" className="text-sm text-text-secondary">{description}</Text>}
            </AriaToastContent>
            <AriaButton
              slot="close"
              aria-label="Cerrar notificación"
              className="-me-1.5 -mt-1.5 flex size-8 items-center justify-center rounded-full text-text-secondary outline-none data-hovered:bg-surface-hover data-focus-visible:focus-ring"
            >
              <X aria-hidden="true" className="size-4" />
            </AriaButton>
          </AriaToast>
        );
      }}
    </AriaToastRegion>
  );
}
