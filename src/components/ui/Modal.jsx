/**
 * @file Modal.jsx
 * @description Accessible dialog modal component.
 *
 * Responsibilities:
 * - Renders an ARIA dialog (`role="dialog"`, `aria-modal="true"`) named by its
 *   title (`aria-labelledby`) and described by its description
 *   (`aria-describedby`), so screen readers announce both on open.
 * - Moves keyboard focus into the dialog when it opens: the first focusable
 *   control in the body, falling back to the header close button, then to the
 *   dialog shell itself.
 * - Traps Tab / Shift+Tab inside the dialog while it is open, so a keyboard-only
 *   user can never act on the page behind it.
 * - Restores focus to the element that was focused before the dialog opened.
 * - Closes on Escape and backdrop click, and locks body scroll while open.
 * - Keeps the header (title + close) and footer pinned while only the body
 *   scrolls, so a tall dialog on a short viewport never hides its own title or
 *   close control, and stays usable on mobile.
 * - Supports `placement`: `center` (default) floats the dialog mid-viewport;
 *   `top` hangs it just below the sticky navbar (a command-palette style panel
 *   that opens from the bar that triggered it) and sizes itself to the space
 *   under the bar.
 *
 * Note: the open/close effect deliberately depends only on `open` and reads
 * `onClose` through a ref. Callers such as the allocation board pass an inline
 * `onClose` whose identity changes on every render; depending on it would
 * re-capture the (already moved) focus and break focus restoration.
 *
 * Expected Usage:
 * ```jsx
 * <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Assign Tutor">
 *   <p>Modal body content</p>
 * </Modal>
 * ```
 */
import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/helpers';

/**
 * Elements that can receive keyboard focus, in DOM order. Hidden and disabled
 * controls are excluded so initial focus never lands on something a keyboard
 * user cannot see or use.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
]
  .map((selector) => `${selector}:not([hidden])`)
  .join(', ');

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  placement = 'center',
}) {
  const dialogRef = useRef(null);
  const bodyRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;

    const dialog = dialogRef.current;
    const initialTarget =
      bodyRef.current?.querySelector(FOCUSABLE_SELECTOR) ??
      dialog?.querySelector(FOCUSABLE_SELECTOR) ??
      dialog;
    initialTarget?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab' || !dialog) return;

      const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        // Nothing to tab to — keep focus on the dialog rather than the page.
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const outside = !dialog.contains(active);

      if (outside) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      // The trigger may have been unmounted by a refetch — only restore focus
      // when the element is still in the document.
      const previous = previousFocusRef.current;
      previousFocusRef.current = null;
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [open]);

  if (!open) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
  const topPlaced = placement === 'top';

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center',
        // `top` starts the panel flush under the h-16 navbar; `center` floats it.
        topPlaced ? 'items-start px-3 pt-16 sm:px-4' : 'items-center p-4'
      )}
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        aria-label={title ? undefined : 'Dialog'}
        tabIndex={-1}
        className={cn(
          'relative flex w-full flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-xl outline-none sm:p-6',
          topPlaced ? 'max-h-[calc(100dvh-5rem)]' : 'max-h-[calc(100dvh-2rem)]',
          sizes[size]
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div>
            {title && (
              <h3 id={titleId} className="text-lg font-bold text-slate-900">
                {title}
              </h3>
            )}
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={bodyRef} data-testid="modal-body" className="mt-5 min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>

        {footer && <div className="mt-6 flex shrink-0 flex-wrap justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
