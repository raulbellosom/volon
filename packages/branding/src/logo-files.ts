/**
 * Raster logo sources relative to the package root; import them as
 * `@delivery/branding/assets/logo/<file>`. Usage rules: docs/brand/identity.md.
 */
export const logoFiles = Object.freeze({
  primary: 'assets/logo/logo-primary.png',
  tagline: 'assets/logo/logo-tagline.png',
  horizontalLight: 'assets/logo/logo-horizontal-light.png',
  monoDark: 'assets/logo/logo-mono-dark.png',
  taglineDark: 'assets/logo/logo-tagline-dark.png',
  horizontalDark: 'assets/logo/logo-horizontal-dark.png',
  symbol: 'assets/logo/symbol.png',
  appIcon: 'assets/logo/app-icon.png',
});

export type LogoVariant = keyof typeof logoFiles;
