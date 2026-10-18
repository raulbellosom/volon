import { Search, X } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Button as AriaButton,
  Input,
  SearchField as AriaSearchField,
  type SearchFieldProps as AriaSearchFieldProps,
} from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';
import { defined } from '../../utils/defined.ts';
import { FieldChrome } from './FieldParts.tsx';
import { bareInputStyles, controlBoxStyles, fieldIconStyles, fieldStyles, type ControlSize } from './field-styles.ts';

export interface SearchFieldProps extends Omit<AriaSearchFieldProps, 'children' | 'className'> {
  /** Visible label; when omitted pass `aria-label`. */
  label?: ReactNode;
  description?: ReactNode;
  placeholder?: string;
  size?: ControlSize;
  className?: string;
}

/** Search input: Escape clears, Enter submits, and a clear button appears once there is text. */
export function SearchField({ label, description, placeholder = 'Buscar', size = 'md', className, ...props }: SearchFieldProps) {
  return (
    <AriaSearchField {...props} className={withStyles(className, () => fieldStyles.root)}>
      <FieldChrome label={label} description={description}>
        <div className={controlBoxStyles({ size })}>
          <span aria-hidden="true" className={fieldIconStyles(size)}><Search /></span>
          <Input {...defined({ placeholder })} className={bareInputStyles} />
          <AriaButton
            aria-label="Limpiar búsqueda"
            className={cx(
              '-me-1 flex size-8 shrink-0 items-center justify-center rounded-full text-text-secondary outline-none',
              'data-hovered:bg-surface-hover data-focus-visible:focus-ring group-data-empty:hidden',
            )}
          >
            <X aria-hidden="true" className="size-4" />
          </AriaButton>
        </div>
      </FieldChrome>
    </AriaSearchField>
  );
}
