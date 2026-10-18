/** Durations in ms. Motion is quick and direct: Volon should feel fast, never floaty. */
export const durations = Object.freeze({
  instant: 80,
  fast: 140,
  base: 200,
  slow: 280,
  slower: 400,
});

/** Cubic-bezier control points. */
export const easings = Object.freeze({
  /** Default for state changes (hover, color, size). */
  standard: [0.2, 0, 0, 1],
  /** Elements entering the screen decelerate into place. */
  enter: [0, 0, 0.2, 1],
  /** Elements leaving accelerate away. */
  exit: [0.4, 0, 1, 1],
  /** Small overshoot for toggles and the pressed «ribbon» rebound. */
  spring: [0.34, 1.4, 0.64, 1],
} satisfies Record<string, readonly [number, number, number, number]>);

export type EasingName = keyof typeof easings;

export function toCubicBezier(name: EasingName): string {
  return `cubic-bezier(${easings[name].join(', ')})`;
}
