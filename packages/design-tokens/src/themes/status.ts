import { brandPalette } from '@delivery/branding';
import type { ColorTokenName, StatusColorTokenName } from '../color-tokens.ts';

/** Brand panel colors identical in both themes so the brand moment looks the same. */
export const brandSurfaceColors: Readonly<Record<Extract<ColorTokenName, `brand-${string}` | 'text-on-brand'>, string>> =
  Object.freeze({
    'brand-surface-start': brandPalette.deepBlue,
    'brand-surface-end': '#0A2FC4',
    'text-on-brand': '#FFFFFF',
  });

/** Delivery status chips share colors across themes; always pair them with icon and text. */
export const statusColors: Readonly<Record<StatusColorTokenName, string>> = Object.freeze({
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
});
