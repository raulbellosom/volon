/** Every spacing value is a multiple of this 4 px unit. */
export const spacingUnit = 4;

export const spacing = Object.freeze({
  0: 0, 0.5: 2, 1: 4, 1.5: 6, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80,
});

/**
 * Radii follow the logo ribbon: actions are pills (full), controls are soft (md) and
 * containers are larger so nested corners stay concentric (outer = inner + padding).
 */
export const radius = Object.freeze({
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 28, full: 9999,
});

/** Interactive heights in px. `md` meets the 44 px touch target recommendation. */
export const controlHeight = Object.freeze({ sm: 36, md: 44, lg: 52 });

export const iconSize = Object.freeze({ sm: 16, md: 20, lg: 24 });

/** Border widths in px; controls use 1.5 px for a crisp edge on dense screens. */
export const borderWidth = Object.freeze({ hairline: 1, control: 1.5, strong: 2 });

/** Viewport breakpoints in px (min-width). */
export const breakpoints = Object.freeze({ sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 });

/** Stacking order for overlays; higher values sit on top. */
export const layers = Object.freeze({
  base: 0,
  raised: 10,
  sticky: 100,
  dropdown: 1000,
  overlay: 1100,
  modal: 1200,
  popover: 1300,
  toast: 1400,
  tooltip: 1500,
});
