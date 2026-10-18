import { Search, X } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Button as AriaButton,
  Input,
  SearchField as AriaSearchField,
  type SearchFieldProps as AriaSearchFieldProps,
} from 'react-aria-components';
import { cx, withStyles } from '../../utils/cx.ts';
import { FieldChrome } from './FieldParts.tsx';
import { controlStyles, fieldStyles, type ControlSize } from './field-styles.ts';

export interface SearchFieldProps extends Omit<AriaSearchFieldProps, 'children' | 'className'> {
  /** Visible label; when omitted pass `aria-label`. */
  label?: ReactNode;
  description?: ReactNode;
  placeholder?: string;
  size?: ControlSize;
  className?: string;
}

/** Search input: Escape clears, Enter submits, and a clear button appears once there is text. */
export function SearchField({ label, description, placeholder = 'Buscar', size, className, ...props }: SearchFieldProps) {
  return (
    <AriaSearchField {...props} className={withStyles(className, () => cx(fieldStyles.root, 'group'))}>
      <FieldChrome label={label} description={description}>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-text-secondary" />
          <Input
            placeholder={placeholder}
            className={cx(controlStyles({ size }), 'ps-11 pe-11 [&::-webkit-search-cancel-button]:hidden')}
          />
          <AriaButton
            aria-label="Limpiar búsqueda"
            className={cx(
              'absolute end-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-text-secondary',
              'outline-none data-hovered:bg-surface-hover data-focus-visible:focus-ring group-data-empty:hidden',
            )}
          >
            <X aria-hidden="true" className="size-4" />
          </AriaButton>
        </div>
      </FieldChrome>
    </AriaSearchField>
  );
}
