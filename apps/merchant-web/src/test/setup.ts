import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom lacks the Web Animations API that React Aria's SelectionIndicator queries.
if (typeof Element.prototype.getAnimations !== 'function') {
  Element.prototype.getAnimations = () => [];
}

// jsdom does not implement scrolling.
window.scrollTo = () => undefined;

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
