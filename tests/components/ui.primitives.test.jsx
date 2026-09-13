/**
 * @file ui.primitives.test.jsx
 * @description Component tests for design system primitive components:
 *   Button, Modal, Badge, EmptyState.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Button } from '../../src/components/ui/Button';
import { Modal } from '../../src/components/ui/Modal';
import { Badge } from '../../src/components/ui/Badge';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Inbox } from 'lucide-react';

// ─── Button ───────────────────────────────────────────────────────────────────

describe('Button', () => {
  it.each([
    ['primary', 'bg-primary'],
    ['secondary', 'bg-white'],
    ['ghost', 'hover:bg-slate-100'],
    ['danger', 'bg-rose-600'],
    ['accent', 'bg-accent'],
  ])('renders the "%s" variant with correct classes', (variant, expectedClass) => {
    render(<Button variant={variant}>{variant}</Button>);
    const btn = screen.getByRole('button', { name: variant });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass(expectedClass);
  });

  it('shows a spinner when loading={true}', () => {
    const { container } = render(<Button loading>Save</Button>);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
  });

  it('is disabled while loading', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });
});

// ─── Modal ────────────────────────────────────────────────────────────────────

describe('Modal', () => {
  let onClose;

  beforeEach(() => {
    onClose = vi.fn();
    document.body.style.overflow = '';
  });

  it('renders nothing when open is false', () => {
    render(<Modal open={false} onClose={onClose} title="Hidden" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens and displays content when open is true', () => {
    render(
      <Modal open onClose={onClose} title="Assign Tutor">
        Body content
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Assign Tutor')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('calls onClose when the backdrop is clicked', () => {
    render(
      <Modal open onClose={onClose} title="Backdrop Test">
        Content
      </Modal>
    );
    const backdrop = screen.getByRole('dialog').parentElement.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the ESC key is pressed', () => {
    render(
      <Modal open onClose={onClose} title="Escape Test">
        Content
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks body scroll while open and restores it on close', () => {
    const { rerender } = render(
      <Modal open onClose={onClose} title="Scroll Lock">
        Content
      </Modal>
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <Modal open={false} onClose={onClose} title="Scroll Lock">
        Content
      </Modal>
    );
    expect(document.body.style.overflow).toBe('');
  });
});

// ─── Badge ────────────────────────────────────────────────────────────────────

describe('Badge', () => {
  it.each([
    ['neutral', 'bg-slate-100'],
    ['success', 'bg-emerald-50'],
    ['warning', 'bg-amber-50'],
    ['danger', 'bg-rose-50'],
    ['info', 'bg-sky-50'],
    ['primary', 'bg-primary-subtle'],
    ['gold', 'text-[#7a6600]'],
  ])('renders the "%s" tone with correct classes', (tone, expectedClass) => {
    render(<Badge tone={tone}>{tone}</Badge>);
    const badge = screen.getByText(tone);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass(expectedClass);
  });

  it('renders a status dot when dot={true}', () => {
    const { container } = render(
      <Badge tone="success" dot>
        Active
      </Badge>
    );
    const dot = container.querySelector('.rounded-full.bg-current');
    expect(dot).toBeInTheDocument();
  });

  it('does not render a dot by default', () => {
    const { container } = render(<Badge tone="neutral">Default</Badge>);
    const dot = container.querySelector('.rounded-full.bg-current');
    expect(dot).not.toBeInTheDocument();
  });
});

// ─── EmptyState ───────────────────────────────────────────────────────────────

describe('EmptyState', () => {
  it('renders the icon, title, and description', () => {
    render(<EmptyState title="No courses found" description="Try adjusting your search filters" />);
    expect(screen.getByText('No courses found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search filters')).toBeInTheDocument();
    // Default Inbox icon renders inside the circular container
    expect(document.querySelector('.rounded-full .h-5.w-5')).toBeInTheDocument();
  });

  it('renders an action button when provided', () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        title="No allocations"
        description="Assign a tutor to get started"
        action={<button onClick={onAction}>Create Allocation</button>}
      />
    );
    const actionBtn = screen.getByRole('button', { name: /create allocation/i });
    expect(actionBtn).toBeInTheDocument();
    fireEvent.click(actionBtn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders a custom icon when provided', () => {
    const { container } = render(<EmptyState icon={Inbox} title="Custom Icon" />);
    const iconWrapper = container.querySelector('.rounded-full');
    expect(iconWrapper.querySelector('.h-5.w-5')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    render(<EmptyState title="Title Only" />);
    expect(screen.getByText('Title Only')).toBeInTheDocument();
    expect(document.querySelector('p.text-slate-400')).not.toBeInTheDocument();
  });
});
