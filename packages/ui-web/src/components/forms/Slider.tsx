import type { ReactNode } from 'react';
import {
  Label,
  Slider as AriaSlider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
  type SliderProps as AriaSliderProps,
} from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';
import { fieldStyles } from './field-styles.ts';

export interface SliderProps<T extends number | number[]> extends Omit<AriaSliderProps<T>, 'children' | 'className'> {
  label?: ReactNode;
  /** Per-thumb accessible names for range sliders, e.g. ['Mínimo', 'Máximo']. */
  thumbLabels?: readonly string[];
  className?: string;
}

const THUMB = cx(
  'top-1/2 size-6 cursor-grab rounded-full border-[3px] border-selection-fill bg-surface shadow-1 outline-none',
  'transition-[transform,box-shadow] duration-(--duration-fast) ease-spring',
  'data-dragging:scale-110 data-dragging:cursor-grabbing data-focus-visible:focus-ring',
  'data-disabled:cursor-not-allowed data-disabled:border-text-disabled',
);

/**
 * Pick a value or range by dragging or with the keyboard (arrows, PageUp/PageDown,
 * Home/End). Use for approximate values; prefer NumberField when exact input matters.
 */
export function Slider<T extends number | number[]>({ label, thumbLabels, className, ...props }: SliderProps<T>) {
  return (
    <AriaSlider {...props} className={withStyles(className, () => cx(fieldStyles.root, 'w-full'))}>
      <div className="flex items-center justify-between gap-3">
        {label && <Label className={fieldStyles.label}>{label}</Label>}
        <SliderOutput className="text-sm font-bold tabular-nums text-text-primary" />
      </div>
      <SliderTrack className="relative h-11 w-full">
        {({ state }) => {
          const values = state.values;
          const start = values.length > 1 ? state.getThumbPercent(0) * 100 : 0;
          const end = state.getThumbPercent(values.length - 1) * 100;
          return (
            <>
              <span className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-surface-sunken" />
              <span
                className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-selection-fill group-data-disabled:bg-text-disabled"
                style={{ insetInlineStart: `${start}%`, width: `${end - start}%` }}
              />
              {values.map((_, index) => (
                <SliderThumb key={index} index={index} {...(thumbLabels?.[index] ? { 'aria-label': thumbLabels[index] } : {})} className={THUMB} />
              ))}
            </>
          );
        }}
      </SliderTrack>
    </AriaSlider>
  );
}
