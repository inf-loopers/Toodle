import { forwardRef } from 'react';
import { cn } from '../../utils/helpers';

const fieldBase =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm ' +
  'placeholder:text-slate-400 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary-subtle ' +
  'disabled:bg-slate-50 disabled:text-slate-400';

export const Input = forwardRef(function Input(
  { label, hint, error, className, id, ...props },
  ref
) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>}
      <input
        ref={ref}
        id={id}
        className={cn(fieldBase, error && 'border-rose-400', className)}
        {...props}
      />
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
});

export const Select = forwardRef(function Select(
  { label, hint, error, className, children, ...props },
  ref
) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>}
      <select
        ref={ref}
        className={cn(
          fieldBase,
          'appearance-none bg-no-repeat pr-8',
          error && 'border-rose-400',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, hint, error, className, ...props },
  ref
) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>}
      <textarea
        ref={ref}
        className={cn(fieldBase, 'min-h-24 resize-y', error && 'border-rose-400', className)}
        {...props}
      />
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
});

export default Input;
