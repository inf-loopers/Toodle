/**
 * @file ui.test.jsx
 * @description Smoke tests verifying base UI component mounting.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../src/App';

describe('App Smoke Test', () => {
  it('renders base welcome screen without crashing', () => {
    render(<App />);
    expect(screen.getByText('Toodle')).toBeInTheDocument();
    expect(
      screen.getByText(/Frontend Base Project Initialized Successfully/i)
    ).toBeInTheDocument();
  });
});
