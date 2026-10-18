import { brandPalette } from '@delivery/branding';

export type ThemeName = 'light' | 'dark';

export type ColorTokenName =
  | 'background' | 'surface' | 'border'
  | 'text-primary' | 'text-secondary' | 'text-link'
  | 'action-primary' | 'text-on-action' | 'accent'
  | 'status-requested-bg' | 'status-requested-fg'
  | 'status-searching-bg' | 'status-searching-fg'
  | 'status-in-transit-bg' | 'status-in-transit-fg'
  | 'status-delivered-bg' | 'status-delivered-fg'
  | 'status-incident-bg' | 'status-incident-fg'
  | 'status-failed-bg' | 'status-failed-fg';

export type ColorTheme = Readonly<Record<ColorTokenName, string>>;

/** Delivery status chips share colors across themes; always pair them with icon and text. */
const statusColors = {
  'status-requested-bg': '#E5E9F2',
  'status-requested-fg': brandPalette.deepBlue,
  'status-searching-bg': brandPalette.electricBlue,
  'status-searching-fg': '#FFFFFF',
  'status-in-transit-bg': brandPalette.deepBlue,
  'status-in-transit-fg': brandPalette.lime,
  'status-delivered-bg': '#15803D',
  'status-delivered-fg': '#FFFFFF',
  'status-incident-bg': '#FFB020',
  'status-incident-fg': brandPalette.deepBlue,
  'status-failed-bg': '#B42318',
  'status-failed-fg': '#FFFFFF',
} as const;

const light: ColorTheme = Object.freeze({
  background: brandPalette.lightGray,
  surface: '#FFFFFF',
  border: '#7C86A0',
  'text-primary': brandPalette.deepBlue,
  'text-secondary': '#5B6478',
  'text-link': brandPalette.electricBlue,
  'action-primary': brandPalette.electricBlue,
  'text-on-action': '#FFFFFF',
  accent: brandPalette.lime,
  ...statusColors,
});

const dark: ColorTheme = Object.freeze({
  background: '#0B1230',
  surface: brandPalette.deepBlue,
  border: '#7C86A0',
  'text-primary': '#FFFFFF',
  'text-secondary': '#B8C2E0',
  'text-link': '#8FA6FF',
  'action-primary': brandPalette.lime,
  'text-on-action': '#0B1230',
  accent: brandPalette.lime,
  ...statusColors,
});

export const colorThemes: Readonly<Record<ThemeName, ColorTheme>> = Object.freeze({ light, dark });
