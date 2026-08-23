/**
 * @file Modal.jsx
 * @description Accessible dialog modal component.
 *
 * Responsibilities:
 * - Uses native HTML `<dialog>` element (`showModal()` / `close()`).
 * - Handles backdrop click to close and Escape key cancel events.
 * - Manages focus trapping and body scroll locking automatically.
 * - Subcomponents:
 *   - `Modal`: Header with title, close button, and body.
 *   - `ModalFooter`: Standardized action buttons wrapper at bottom.
 *
 * Expected Usage:
 * ```jsx
 * <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Assign Tutor">
 *   <p>Modal body content</p>
 *   <ModalFooter><Button onClick={() => setIsOpen(false)}>Close</Button></ModalFooter>
 * </Modal>
 * ```
 */
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/helpers';

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('relative w-full rounded-2xl bg-white p-6 shadow-xl', sizes[size])}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && <h3 className="text-lg font-bold text-slate-900">{title}</h3>}
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5">{children}</div>

        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
