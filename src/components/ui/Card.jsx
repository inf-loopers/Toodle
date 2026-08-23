/**
 * @file Card.jsx
 * @description Surface container primitive for content grouping.
 *
 * Responsibilities:
 * - Provides consistent border, background, shadow, padding, and hover elevation states.
 * - Subcomponents:
 *   - `CardHeader`: Title, description, and action button slot.
 *   - `CardBody`: Main content container.
 *   - `CardFooter`: Bottom action row with divider.
 *
 * Expected Usage:
 * ```jsx
 * <Card hover>
 *   <CardHeader title="Course Info" action={<Button size="sm">Edit</Button>} />
 *   <CardBody>Content</CardBody>
 * </Card>
 * ```
 */
import { cn } from '../../utils/helpers';

export function Card({ className, children, padded = true, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white shadow-sm',
        padded && 'p-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, title, description, action, children }) {
  return (
    <div
      className={cn('flex flex-col justify-between gap-4 sm:flex-row sm:items-center', className)}
    >
      <div>
        {title && <h2 className="font-semibold text-slate-900">{title}</h2>}
        {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
        {children}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={cn('mt-5', className)}>{children}</div>;
}

export default Card;
