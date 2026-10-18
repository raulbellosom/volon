import { brand } from '@delivery/branding';

/** React Native must register the font file in each app; web falls back to the system font. */
export const typography = Object.freeze({
  fontFamilySans: `'${brand.fontFamily}', system-ui, sans-serif`,
  weightRegular: 400,
  weightMedium: 500,
  weightSemibold: 600,
  weightBold: 700,
  weightExtrabold: 800,
});

export interface TypeStep {
  /** Font size in px. */
  readonly size: number;
  /** Line height in px; every value sits on the 4 px grid. */
  readonly lineHeight: number;
  /** Letter spacing in em. */
  readonly tracking: number;
}

/** Size scale. Large steps tighten tracking; text below 14 px is reserved for captions. */
export const typeScale = Object.freeze({
  xs: { size: 12, lineHeight: 16, tracking: 0.01 },
  sm: { size: 14, lineHeight: 20, tracking: 0 },
  md: { size: 16, lineHeight: 24, tracking: 0 },
  lg: { size: 18, lineHeight: 28, tracking: -0.005 },
  xl: { size: 20, lineHeight: 28, tracking: -0.01 },
  '2xl': { size: 24, lineHeight: 32, tracking: -0.015 },
  '3xl': { size: 30, lineHeight: 36, tracking: -0.02 },
  '4xl': { size: 36, lineHeight: 44, tracking: -0.025 },
  '5xl': { size: 48, lineHeight: 56, tracking: -0.03 },
} satisfies Record<string, TypeStep>);

export type TypeScaleStep = keyof typeof typeScale;

/** Uppercase overline echoing the spaced «PÍDELO DE VOLON» tagline of the logo. */
export const overlineTracking = 0.14;
