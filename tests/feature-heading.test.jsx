import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import FeatureHeading from '../src/components/layout/FeatureHeading';

describe('Feature heading navigation', () => {
  it.each(['/courses', '/volunteers', '/calendar', '/timesheets'])(
    'returns from %s to the dashboard using the keyboard',
    async (path) => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={path} element={<FeatureHeading>Feature</FeatureHeading>} />
            <Route path="/dashboard" element={<p>Dashboard content</p>} />
          </Routes>
        </MemoryRouter>
      );
      await user.tab();
      expect(
        screen.getByRole('link', { name: 'Close Feature and return to Dashboard' })
      ).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    }
  );

  it.each(['/dashboard', '/courses/c1'])(
    'does not add dashboard-close navigation at %s',
    (path) => {
      render(
        <MemoryRouter initialEntries={[path]}>
          <FeatureHeading>Feature</FeatureHeading>
        </MemoryRouter>
      );
      expect(screen.getByRole('heading', { name: 'Feature' })).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    }
  );
});
