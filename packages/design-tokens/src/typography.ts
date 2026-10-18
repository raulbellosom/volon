import { brand } from '@delivery/branding';

/** React Native must register the font file in each app; web falls back to the system font. */
export const typography = Object.freeze({
  fontFamilySans: `'${brand.fontFamily}', system-ui, sans-serif`,
  weightRegular: 400,
  weightSemibold: 600,
  weightExtrabold: 800,
});
