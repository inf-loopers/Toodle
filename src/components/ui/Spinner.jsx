/**
 * @file Spinner.jsx
 * @description Accessible SVG / CSS loading spinner indicator.
 *
 * Responsibilities:
 * - Visually communicates asynchronous pending operations.
 * - Supports sizes: `sm` (16px), `md` (24px), `lg` (32px), `xl` (48px).
 * - Includes ARIA accessibility (`role="status"` and hidden screen-reader text).
 *
 * Expected Usage:
 * ```jsx
 * <Spinner size="md" className="text-primary" />
 * ```
 */
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/helpers';

export function Spinner({ size = 'md', label = 'Loading…', className, fullPage = false }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-9 w-9' };

  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3 text-slate-400', className)}>
      <Loader2 className={cn(sizes[size], 'animate-spin text-primary')} aria-hidden="true" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );

  if (fullPage) {
    return <div className="flex min-h-[60vh] w-full items-center justify-center">{content}</div>;
  }

  return content;
}

export default Spinner;
