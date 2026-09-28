/**
 * @file modal-accessibility.test.jsx
 * @description Accessibility contract of the shared Modal: ARIA naming, initial
 * focus, Tab / Shift+Tab trapping, focus restoration and dismissal paths.
 *
 * Tab assertions use fireEvent rather than userEvent.tab() on purpose: jsdom does
 * not implement native focus traversal, so these tests pin the behaviour the
 * Modal itself owns (wrapping at the boundaries and pulling escaped focus back).
 */

import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import Modal from '../src/components/ui/Modal';

function ModalHarness() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open modal
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Assign tutor"
        description="Pick a tutor for this course."
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button">Confirm</button>
          </>
        }
      >
        <label htmlFor="tutor-name">Tutor name</label>
        <input id="tutor-name" type="text" />
      </Modal>
    </div>
  );
}

async function openModal(user) {
  render(<ModalHarness />);
  await user.click(screen.getByRole('button', { name: 'Open modal' }));
  return screen.getByRole('dialog', { name: 'Assign tutor' });
}

describe('Modal accessibility', () => {
  it('names the dialog by its title and describes it by its description', async () => {
    const user = userEvent.setup();
    const dialog = await openModal(user);

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Assign tutor');
    expect(document.getElementById(dialog.getAttribute('aria-describedby'))).toHaveTextContent(
      'Pick a tutor for this course.'
    );
  });

  it('moves keyboard focus into the dialog when it opens', async () => {
    const user = userEvent.setup();
    const dialog = await openModal(user);

    // The first control in the body, so a keyboard user can start immediately.
    expect(screen.getByLabelText('Tutor name')).toHaveFocus();
    expect(dialog).toContainElement(document.activeElement);
  });

  it('keeps Tab and Shift+Tab cycling inside the dialog', async () => {
    const user = userEvent.setup();
    const dialog = await openModal(user);

    const close = within(dialog).getByRole('button', { name: 'Close' });
    const confirm = within(dialog).getByRole('button', { name: 'Confirm' });

    // Tabbing past the last control wraps to the first.
    confirm.focus();
    fireEvent.keyDown(confirm, { key: 'Tab' });
    expect(close).toHaveFocus();

    // Shift+Tab before the first control wraps to the last.
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();

    // Focus that has escaped the dialog is pulled back inside it.
    document.activeElement.blur();
    fireEvent.keyDown(document.body, { key: 'Tab' });
    expect(close).toHaveFocus();
    expect(dialog).toContainElement(document.activeElement);
  });

  it('returns focus to the element that opened the dialog when it closes', async () => {
    const user = userEvent.setup();
    await openModal(user);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open modal' })).toHaveFocus();
  });

  it('locks body scroll while open and releases it on a backdrop click', async () => {
    const user = userEvent.setup();
    const { container } = render(<ModalHarness />);
    await user.click(screen.getByRole('button', { name: 'Open modal' }));

    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(container.querySelector('.absolute.inset-0'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  it('falls back to the close button when the body has no focusable control', () => {
    render(
      <Modal open onClose={() => {}} title="Notice">
        <p>Nothing interactive in here.</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog', { name: 'Notice' });
    const close = within(dialog).getByRole('button', { name: 'Close' });
    expect(close).toHaveFocus();

    // With a single focusable control, Tab must not let focus escape.
    fireEvent.keyDown(close, { key: 'Tab' });
    expect(dialog).toContainElement(document.activeElement);
  });
});
