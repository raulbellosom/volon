import { composeRenderProps } from 'react-aria-components';

export type ClassValue = string | false | null | undefined;

/** Joins class names, skipping falsy values. Consumer classes are meant for layout, not restyling. */
export function cx(...values: readonly ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}

type RenderPropsWithDefault<T> = T & { defaultClassName: string | undefined };

/** React Aria `className` prop: a string or a function of the component render props. */
export type ClassNameProp<T> = string | ((values: RenderPropsWithDefault<T>) => string) | undefined;

/**
 * Merges Volon styles (computed from React Aria render props) with an optional consumer
 * className, which may itself be a string or a render-props function.
 */
export function withStyles<T>(className: ClassNameProp<T>, styles: (renderProps: T) => string) {
  return composeRenderProps<string | undefined, RenderPropsWithDefault<T>, string>(
    className,
    (consumerClassName, renderProps) => cx(styles(renderProps), consumerClassName),
  );
}
