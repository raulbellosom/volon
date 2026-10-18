import { brandPalette } from '@delivery/branding';
import type { StatusColorTokenName } from '../color-tokens.ts';

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
