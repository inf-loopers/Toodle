/**
 * @file LogoutButton.jsx
 * @description Button component that terminates the user's session with Auth0.
 *
 * Responsibilities:
 * - Invokes `logout()` from the `useAuth()` hook.
 * - Shows a confirmation prompt before logging out.
 * - Displays loading state while logout is in progress.
 * - Cleans up cached session data and redirects to landing page.
 *
 * Expected Usage:
 * ```jsx
 * <LogoutButton variant="ghost" size="sm" />
 * ```
 */

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/helpers';

export function LogoutButton({ className, children, showIcon = true, showLabel = true, onClick: externalOnClick, ...rest }) {
  const { logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleClick = () => {
    if (externalOnClick) externalOnClick();

    if (!confirming) {
      setConfirming(true);
      // Auto-dismiss the confirmation after 3 seconds
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setLoggingOut(true);
    logout();
  };

  const label = children || (confirming ? 'Click again to confirm' : 'Sign out');

  return (
    <button
      {...rest}
      onClick={handleClick}
      disabled={loggingOut}
      className={cn(
        'inline-flex items-center gap-1.5 transition-colors',
        confirming && 'text-rose-600',
        loggingOut && 'cursor-wait opacity-60',
        className
      )}
    >
      {showIcon && <LogOut className="h-3.5 w-3.5" />}
      {showLabel && <span>{label}</span>}
    </button>
  );
}

export default LogoutButton;

