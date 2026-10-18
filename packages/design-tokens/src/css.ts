import type { ColorTheme } from './themes.ts';

/** Serializes a theme as CSS custom properties; usable in `:root`, a theme selector or Tailwind 4 `@theme`. */
export function toCssVariables(theme: ColorTheme, selector = ':root'): string {
  const declarations = Object.entries(theme).map(([name, value]) => `  --color-${name}: ${value};`);
  return `${selector} {\n${declarations.join('\n')}\n}\n`;
}
