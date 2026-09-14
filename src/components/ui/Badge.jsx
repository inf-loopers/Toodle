/**
 * @file Badge.jsx
 * @description Accessible status chip and pill component.
 *
 * Responsibilities:
 * - Visually communicates roles (e.g. Organiser, Tutor, Student), course statuses (Full, Understaffed), and constraint states (Warning, Error, Valid).
 * - Supports color variants: `neutral`, `primary`, `success`, `warning`, `danger`, `purple`.
 * - Optional status dot indicator (`dot={true}`).
 * - Sizes: `sm`, `md`, `lg`.
 *
 * Expected Usage:
 * ```jsx
 * <Badge variant="success" dot>Full Quota</Badge>
 * <Badge variant="danger">Timetable Clash</Badge>
 * ```
 */
import { cn } from '../../utils/helpers';

const TONES = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-rose-50 text-rose-700',
  info: 'bg-sky-50 text-sky-700',
  primary: 'bg-primary-subtle text-primary',
  gold: 'bg-wits-gold-light/30 text-[#7a6600]',
};

export function Badge({ tone = 'neutral', className, children, dot = false, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        TONES[tone],
        className
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export default Badge;
