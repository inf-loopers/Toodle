import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../src/components/layout/Sidebar';

const viewport = vi.hoisted(() => ({ mobile: true }));
vi.mock('../src/hooks/useIsMobile', () => ({ useIsMobile: () => viewport.mobile }));
vi.mock('../src/hooks/useAuth', () => ({
  useAuth: () => ({ role: 'student', logout: vi.fn() }),
}));

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <MemoryRouter>
      <button onClick={() => setOpen(true)}>Open navigation</button>
      <Sidebar isOpen={open} onClose={() => setOpen(false)} />
      <button>Page action</button>
    </MemoryRouter>
  );
}

beforeEach(() => {
  viewport.mobile = true;
});

describe('Responsive navigation accessibility', () => {
  it('makes the closed mobile drawer inert and keeps desktop navigation available', () => {
    const view = render(<Harness />);
    expect(screen.getByTestId('app-sidebar')).toHaveAttribute('inert');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    viewport.mobile = false;
    view.rerender(<Harness />);
    expect(screen.getByTestId('app-sidebar')).not.toHaveAttribute('inert');
    expect(screen.getByRole('link', { name: 'Courses' })).toBeInTheDocument();
  });

  it('opens by keyboard, names the drawer, traps focus, and restores it on Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open navigation' });
    trigger.focus();
    await user.keyboard('{Enter}');
    const drawer = screen.getByRole('dialog', { name: 'Main navigation' });
    expect(drawer).toHaveAttribute('aria-modal', 'true');
    const close = within(drawer).getByRole('button', { name: 'Close navigation' });
    expect(close).toHaveFocus();
    const last = within(drawer).getByRole('button', { name: 'Sign out' });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(screen.getByTestId('app-sidebar')).toHaveAttribute('inert');
  });

  it('lets a keyboard user navigate and closes the drawer without exposing staff links', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const courses = screen.getByRole('link', { name: 'Courses' });
    courses.focus();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Allocation Board' })).not.toBeInTheDocument();
  });
});
