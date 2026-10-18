import { contrastRatio } from './contrast.ts';
import type { ColorTheme, ColorTokenName, FeedbackTone } from './color-tokens.ts';

export interface ContrastRequirement {
  readonly foreground: ColorTokenName;
  readonly background: ColorTokenName;
  readonly minimum: number;
}

export interface ContrastFailure extends ContrastRequirement {
  readonly ratio: number;
}

/** WCAG 2.x AA: 4.5 for normal text, 3 for UI component boundaries and focus indicators. */
const TEXT = 4.5;
const NON_TEXT = 3;

const STATUSES = ['requested', 'searching', 'in-transit', 'delivered', 'incident', 'failed'] as const;
const FEEDBACK: readonly FeedbackTone[] = ['info', 'success', 'warning', 'danger'];
const READING_SURFACES: readonly ColorTokenName[] = [
  'background', 'surface', 'surface-raised', 'surface-sunken', 'surface-hover', 'surface-selected',
];

function pairs(
  foreground: ColorTokenName,
  backgrounds: readonly ColorTokenName[],
  minimum: number,
): ContrastRequirement[] {
  return backgrounds.map((background) => ({ foreground, background, minimum }));
}

export const contrastRequirements: readonly ContrastRequirement[] = Object.freeze([
  ...pairs('text-primary', READING_SURFACES, TEXT),
  ...pairs('text-secondary', ['background', 'surface', 'surface-raised', 'surface-sunken'], TEXT),
  ...pairs('text-link', ['background', 'surface', 'surface-raised'], TEXT),
  ...pairs('text-on-action', ['action-primary', 'action-primary-hover', 'action-primary-pressed'], TEXT),
  ...pairs('text-on-secondary', ['action-secondary', 'action-secondary-hover'], TEXT),
  ...pairs('text-on-accent', ['action-accent', 'action-accent-hover'], TEXT),
  ...pairs('text-on-danger', ['action-danger', 'action-danger-hover'], TEXT),
  ...pairs('border', ['background', 'surface', 'surface-raised'], NON_TEXT),
  ...pairs('focus-ring', ['background', 'surface', 'surface-raised'], NON_TEXT),
  ...pairs('action-primary', ['background', 'surface'], NON_TEXT),
  ...pairs('selection-fill', ['background', 'surface', 'surface-raised'], NON_TEXT),
  ...pairs('selection-mark', ['selection-fill'], NON_TEXT),
  ...pairs('text-on-brand', ['brand-surface-start', 'brand-surface-end'], TEXT),
  ...FEEDBACK.flatMap((tone) => pairs(`feedback-${tone}-fg`, [`feedback-${tone}-bg`, 'surface'], TEXT)),
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
