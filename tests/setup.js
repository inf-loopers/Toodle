/**
 * @file setup.js
 * @description Global Vitest environment configuration and DOM cleanup handlers.
 */

import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Automatically cleanup DOM tree after each test run
afterEach(() => {
  cleanup();
});
