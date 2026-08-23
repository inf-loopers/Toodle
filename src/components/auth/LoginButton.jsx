/**
 * @file LoginButton.jsx
 * @description Button component that triggers the Auth0 Universal Login flow.
 *
 * Responsibilities:
 * - Invokes `login()` / `loginWithRedirect()` from the `useAuth()` hook.
 * - Handles loading state while Auth0 initializes.
 * - Accepts customizable variant, size, and label props.
 *
 * Expected Usage:
 * ```jsx
 * <LoginButton size="lg" className="w-full" />
 * ```
 */

import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';

/**
 * Triggers the real Auth0 redirect. Dev-mode role switching lives on the
 * LoginPage itself (loginAsDevRole), since it needs to show all three options.
 */
export function LoginButton({ className, children = 'Sign In to Portal', ...props }) {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await login();
    } catch {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} loading={loading} className={className} {...props}>
      {!loading && <LogIn className="h-4 w-4" />}
      {children}
    </Button>
  );
}

export default LoginButton;
