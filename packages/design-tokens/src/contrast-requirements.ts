import { contrastRatio } from './contrast.ts';
import type { ColorTheme, ColorTokenName } from './themes.ts';

export interface ContrastRequirement {
  readonly foreground: ColorTokenName;
  readonly background: ColorTokenName;
  readonly minimum: number;
}

export interface ContrastFailure extends ContrastRequirement {
  readonly ratio: number;
}

/** WCAG 2.x AA: 4.5 for normal text, 3 for UI component boundaries. */
const TEXT = 4.5;
const NON_TEXT = 3;

const STATUSES = ['requested', 'searching', 'in-transit', 'delivered', 'incident', 'failed'] as const;

export const contrastRequirements: readonly ContrastRequirement[] = Object.freeze([
  { foreground: 'text-primary', background: 'background', minimum: TEXT },
  { foreground: 'text-primary', background: 'surface', minimum: TEXT },
  { foreground: 'text-secondary', background: 'background', minimum: TEXT },
  { foreground: 'text-secondary', background: 'surface', minimum: TEXT },
  { foreground: 'text-link', background: 'background', minimum: TEXT },
  { foreground: 'text-link', background: 'surface', minimum: TEXT },
  { foreground: 'text-on-action', background: 'action-primary', minimum: TEXT },
  { foreground: 'border', background: 'background', minimum: NON_TEXT },
  { foreground: 'border', background: 'surface', minimum: NON_TEXT },
  ...STATUSES.map((status): ContrastRequirement => ({
    foreground: `status-${status}-fg`, background: `status-${status}-bg`, minimum: TEXT,
  })),
]);

/** Returns every declared pair below its minimum; an empty list means the theme passes. */
export function auditContrast(theme: ColorTheme): ContrastFailure[] {
  return contrastRequirements
    .map((requirement) => ({
      ...requirement,
      ratio: contrastRatio(theme[requirement.foreground], theme[requirement.background]),
    }))
    .filter((result) => result.ratio < result.minimum);
}
