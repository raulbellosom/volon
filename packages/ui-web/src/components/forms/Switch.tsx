import type { ReactNode } from 'react';
import { Switch as AriaSwitch, type SwitchProps as AriaSwitchProps } from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';

const TRACK = cx(
  'relative h-6.5 w-11 shrink-0 rounded-full bg-border',
  'transition-colors duration-(--duration-base) ease-standard',
  'group-data-selected:bg-selection-fill group-data-focus-visible:focus-ring',
  'group-data-disabled:opacity-40',
);

const THUMB = cx(
  'absolute top-[3px] left-0 size-5 translate-x-[3px] rounded-full bg-surface shadow-1',
  'transition-[transform,background-color] duration-(--duration-base) ease-spring',
  'group-data-selected:translate-x-[21px] group-data-selected:bg-selection-mark group-data-pressed:scale-90',
  'group-data-disabled:shadow-none',
);

export interface SwitchProps extends Omit<AriaSwitchProps, 'children' | 'className'> {
  /** The setting this switch turns on or off, written as a noun («Notificaciones»). */
  children: ReactNode;
  className?: string;
}

/** Immediate on/off setting. For choices applied on submit, prefer a checkbox. */
export function Switch({ children, className, ...props }: SwitchProps) {
  return (
    <AriaSwitch
      {...props}
      className={withStyles(className, () =>
        cx(
          'group inline-flex min-h-11 cursor-pointer items-center gap-3 text-md text-text-primary outline-none',
          'data-disabled:cursor-not-allowed data-disabled:text-text-disabled',
        ))}
    >
      <span aria-hidden="true" className={TRACK}>
        <span className={THUMB} />
      </span>
      <span>{children}</span>
    </AriaSwitch>
  );
}
