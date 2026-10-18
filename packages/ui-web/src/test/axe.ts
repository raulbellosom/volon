import axe from 'axe-core';

/**
 * Runs axe on a rendered subtree and returns readable violations.
 * Color contrast is skipped because jsdom has no layout; the token audit in
 * @delivery/design-tokens enforces contrast instead.
 */
export async function axeViolations(container: Element): Promise<string[]> {
  const result = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  return result.violations.map((violation) => `${violation.id}: ${violation.help}`);
}
