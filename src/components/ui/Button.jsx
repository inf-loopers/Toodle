/**
 * @file Button.jsx
 * @description Accessible, reusable button component.
 *
 * Responsibilities:
 * - Supports style variants: `primary`, `secondary`, `accent`, `danger`, `ghost`, `outline`.
 * - Sizes: `sm`, `md`, `lg`.
 * - Built-in loading state (`isLoading={true}`) with embedded `<Spinner />`.
 * - Left/right icon slots for Lucide icons.
 * - Forwards HTML button attributes and refs.
 *
 * Expected Usage:
 * ```jsx
 * <Button variant="primary" leftIcon={<Plus />} onClick={handleCreate}>Add Course</Button>
 * ```
 */
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/helpers';

const VARIANTS = {
  primary:
    'bg-primary text-white shadow-sm hover:bg-primary-hover focus-visible:outline-primary disabled:bg-slate-300',
  secondary:
    'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-primary disabled:text-slate-300',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-primary disabled:text-slate-300',
  danger:
    'bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:outline-rose-600 disabled:bg-rose-200',
  accent:
    'bg-accent text-white shadow-sm hover:bg-accent-hover focus-visible:outline-accent disabled:bg-amber-200',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-5 py-3 text-sm gap-2',
  icon: 'p-2.5',
};

export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className,
    children,
    type = 'button',
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:shadow-none',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

export default Button;
