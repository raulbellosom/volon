import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom lacks the Web Animations API that React Aria's SelectionIndicator queries.
// Node-environment test files (token sync, coverage) have no DOM at all.
if (typeof Element !== 'undefined' && typeof Element.prototype.getAnimations !== 'function') {
  Element.prototype.getAnimations = () => [];
}

afterEach(() => cleanup());
