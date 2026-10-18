import type { ThemeName } from './color-tokens.ts';

export interface ShadowLayer {
  readonly y: number;
  readonly blur: number;
  readonly spread: number;
  /** #RRGGBB shadow color. */
  readonly color: string;
  readonly opacity: number;
}

export type ElevationLevel = 1 | 2 | 3;

/**
 * Light shadows are tinted with deep blue so they feel part of the palette.
 * Dark mode relies on lighter surfaces for depth; shadows are only a soft separation.
 */
export const elevation: Readonly<Record<ThemeName, Readonly<Record<ElevationLevel, readonly ShadowLayer[]>>>> = {
  light: {
    1: [
      { y: 1, blur: 2, spread: 0, color: '#001863', opacity: 0.06 },
      { y: 1, blur: 3, spread: 0, color: '#001863', opacity: 0.08 },
    ],
    2: [
      { y: 4, blur: 12, spread: -2, color: '#001863', opacity: 0.12 },
      { y: 2, blur: 4, spread: 0, color: '#001863', opacity: 0.06 },
    ],
    3: [
      { y: 16, blur: 40, spread: -8, color: '#001863', opacity: 0.22 },
      { y: 4, blur: 12, spread: 0, color: '#001863', opacity: 0.08 },
    ],
  },
  dark: {
    1: [{ y: 1, blur: 2, spread: 0, color: '#000000', opacity: 0.4 }],
    2: [{ y: 8, blur: 20, spread: -4, color: '#000000', opacity: 0.55 }],
    3: [{ y: 24, blur: 56, spread: -12, color: '#000000', opacity: 0.7 }],
  },
};

function rgba(hex: string, opacity: number): string {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  return `rgb(${channels.join(' ')} / ${opacity})`;
}

export function toBoxShadow(layers: readonly ShadowLayer[]): string {
  return layers.map((layer) => `0 ${layer.y}px ${layer.blur}px ${layer.spread}px ${rgba(layer.color, layer.opacity)}`)
    .join(', ');
}
