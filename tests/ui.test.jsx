/**
 * @file ui.test.jsx
 * @description Smoke tests verifying base UI component mounting.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../src/App';

describe('App Smoke Test', () => {
  it('renders application without crashing', () => {
    render(<App />);
    expect(screen.getAllByText(/toodle/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/wits sdp/i)).toBeInTheDocument();
  });
});
