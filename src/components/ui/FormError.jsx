/**
 * @file FormError.jsx
 * @description Standardized, accessible presentation for a failed form/API action.
 *
 * Responsibilities:
 * - Renders the failure inside a `role="alert"` region so assistive technology
 *   announces it the moment it appears instead of on the next navigation.
 * - Pairs the message with a clear next action, because "something went wrong"
 *   on its own leaves the user guessing what to do.
 * - Renders nothing when there is no message, so it is safe to leave mounted
 *   next to the fields it describes.
 *
 * Pass `hint={null}` when the message already tells the user what to do
 * (e.g. "Please resolve the timetable clash first.").
 *
 * Expected Usage:
 * ```jsx
 * <FormError message={error} />
 * <FormError message={error} hint="Close and reopen the dialog to start again." />
 * ```
 */
import { AlertCircle } from 'lucide-react';
import { cn } from '../../utils/helpers';

const DEFAULT_HINT = 'Your input has been kept — you can adjust it and try again.';

export function FormError({ message, hint = DEFAULT_HINT, className }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5',
        className
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-rose-700">{message}</p>
        {hint && <p className="mt-0.5 text-xs text-rose-500">{hint}</p>}
      </div>
    </div>
  );
}

export default FormError;
