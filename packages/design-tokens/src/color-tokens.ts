export type ThemeName = 'light' | 'dark';

/** Delivery status chips (approved in docs/brand/identity.md); shared by both themes. */
export type StatusColorTokenName =
  | 'status-requested-bg' | 'status-requested-fg'
  | 'status-searching-bg' | 'status-searching-fg'
  | 'status-in-transit-bg' | 'status-in-transit-fg'
  | 'status-delivered-bg' | 'status-delivered-fg'
  | 'status-incident-bg' | 'status-incident-fg'
  | 'status-failed-bg' | 'status-failed-fg';

export type FeedbackTone = 'info' | 'success' | 'warning' | 'danger';

export type FeedbackColorTokenName = `feedback-${FeedbackTone}-${'fg' | 'bg' | 'border'}`;

/** Semantic, brand-neutral color roles. Apps consume these names, never raw hex values. */
export type ColorTokenName =
  | 'background' | 'surface' | 'surface-raised' | 'surface-sunken'
  | 'surface-hover' | 'surface-selected' | 'surface-disabled' | 'scrim'
  | 'border' | 'border-subtle' | 'focus-ring'
  | 'text-primary' | 'text-secondary' | 'text-link' | 'text-disabled'
  | 'action-primary' | 'action-primary-hover' | 'action-primary-pressed' | 'text-on-action'
  | 'action-secondary' | 'action-secondary-hover' | 'text-on-secondary'
  | 'action-accent' | 'action-accent-hover' | 'text-on-accent'
  | 'action-danger' | 'action-danger-hover' | 'text-on-danger'
  | 'accent'
  | FeedbackColorTokenName
  | StatusColorTokenName;

export type ColorTheme = Readonly<Record<ColorTokenName, string>>;
