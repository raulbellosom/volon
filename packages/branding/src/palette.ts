/** Brand colors approved 17-10-2026. Semantic usage lives in @delivery/design-tokens. */
export const brandPalette = Object.freeze({
  electricBlue: '#0A3DFF',
  lime: '#C6FF3B',
  deepBlue: '#001863',
  lightGray: '#F4F6F8',
});

export type BrandColor = keyof typeof brandPalette;
