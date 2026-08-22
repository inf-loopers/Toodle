/**
 * @file LoginForm.jsx
 * @description Right-panel sign-in form for the login page. Contains email
 *              and password fields with validation, a "Continue" button that
 *              triggers Auth0 authentication, alternative SSO login options
 *              (Wits Staff SSO, Google), and a "Request Access" link.
 *
 * Responsibilities:
 * - Renders the "Sign In" heading and "Welcome back to the admin portal."
 *   subtitle.
 * - Renders email input with envelope icon and inline validation error.
 * - Renders password input with lock icon, visibility toggle (eye icon),
 *   and inline validation error.
 * - Provides a "Forgot password?" link aligned to the right of the password
 *   field.
 * - Renders a "Continue" submit button that triggers Auth0's
 *   `loginWithRedirect` on valid form submission.
 * - Renders an "OR CONTINUE WITH" divider with horizontal rules.
 * - Renders Wits Staff SSO and Google alternative login buttons using
 *   `SocialButton`.
 * - Renders a "Don't have an account? Request Access" prompt.
 * - Shows a loading spinner and disables inputs during submission.
 * - Displays a submit-level error banner when authentication fails.
 *
 * Usage:
 *   <LoginForm />
 */

import React from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLoginForm } from '../../hooks/useLoginForm';
import SocialButton from './SocialButton';

/**
 * Inline SVG for the Google "G" logo.
 * Kept as a constant to avoid cluttering the JSX.
 */
function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
        fill="#EA4335"
      />
    </svg>
  );
}

/**
 * LoginForm
 *
 * The complete sign-in form panel. Uses `useLoginForm` for state management
 * and `useAuth` for the Auth0 login trigger.
 */
export default function LoginForm() {
  // ── Auth0 integration ───────────────────────────────────────────────
  const { login, isLoading: isAuthLoading } = useAuth();

  /**
   * Wraps Auth0's loginWithRedirect so the form hook can call it
   * with the email as a login_hint for a smoother UX.
   */
  const handleLogin = React.useCallback(
    async ({ email }) => {
      // Pass the email as a login hint so Auth0 can pre-fill it on the
      // Universal Login page if this is the user's first time.
      await login({
        authorizationParams: {
          login_hint: email,
        },
      });
    },
    [login],
  );

  // ── Form state & handlers ───────────────────────────────────────────
  const {
    email,
    password,
    errors,
    showPassword,
    isLoading,
    submitError,
    handleEmailChange,
    handlePasswordChange,
    handleBlurEmail,
    handleBlurPassword,
    togglePasswordVisibility,
    handleSubmit,
  } = useLoginForm(handleLogin);

  // ── SSO handlers ────────────────────────────────────────────────────

  /**
   * Triggers Auth0 login with the Wits Staff SSO enterprise connection.
   * The `connection` param tells Auth0 to skip the Universal Login page
   * and go directly to the Wits identity provider.
   */
  const handleWitsSSO = React.useCallback(() => {
    login({
      authorizationParams: {
        connection: 'Wits-Staff-SSO',
      },
    });
  }, [login]);

  /**
   * Triggers Auth0 login with the Google social connection.
   */
  const handleGoogleLogin = React.useCallback(() => {
    login({
      authorizationParams: {
        connection: 'google-oauth2',
      },
    });
  }, [login]);

  // ── Determine if the form should be disabled ────────────────────────
  const isDisabled = isLoading || isAuthLoading;

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Sign In
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Welcome back to the admin portal.
        </p>
      </div>

      {/* ── Submit-level error banner ───────────────────────────────── */}
      {submitError && (
        <div
          className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0 text-red-500"
            aria-hidden="true"
          />
          <span>{submitError}</span>
        </div>
      )}

      {/* ── Sign-in form ────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* ── Email field ─────────────────────────────────────────── */}
        <div>
          <label
            htmlFor="login-email"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Email Address
          </label>
          <div className="relative">
            {/* Envelope icon on the left */}
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail size={18} className="text-slate-400" aria-hidden="true" />
            </span>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleBlurEmail}
              placeholder="name@wits.ac.za"
              autoComplete="email"
              disabled={isDisabled}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              className={`
                block w-full rounded-lg border bg-white py-2.5 pl-10 pr-3
                text-sm text-slate-900 placeholder:text-slate-400
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-offset-0
                disabled:cursor-not-allowed disabled:bg-slate-50
                disabled:text-slate-500
                ${
                  errors.email
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                    : 'border-slate-300 focus:border-slate-400 focus:ring-slate-200'
                }
              `}
            />
          </div>
          {/* Inline validation error */}
          {errors.email && (
            <p
              id="login-email-error"
              className="mt-1.5 text-xs text-red-600"
              role="alert"
            >
              {errors.email}
            </p>
          )}
        </div>

        {/* ── Password field ──────────────────────────────────────── */}
        <div>
          <label
            htmlFor="login-password"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <div className="relative">
            {/* Lock icon on the left */}
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock size={18} className="text-slate-400" aria-hidden="true" />
            </span>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={handlePasswordChange}
              onBlur={handleBlurPassword}
              placeholder="********"
              autoComplete="current-password"
              disabled={isDisabled}
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? 'login-password-error' : undefined
              }
              className={`
                block w-full rounded-lg border bg-white py-2.5 pl-10 pr-10
                text-sm text-slate-900 placeholder:text-slate-400
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-offset-0
                disabled:cursor-not-allowed disabled:bg-slate-50
                disabled:text-slate-500
                ${
                  errors.password
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                    : 'border-slate-300 focus:border-slate-400 focus:ring-slate-200'
                }
              `}
            />
            {/* Eye icon toggle on the right */}
            <button
              type="button"
              onClick={togglePasswordVisibility}
              disabled={isDisabled}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {showPassword ? (
                <EyeOff size={18} aria-hidden="true" />
              ) : (
                <Eye size={18} aria-hidden="true" />
              )}
            </button>
          </div>
          {/* Inline validation error */}
          {errors.password && (
            <p
              id="login-password-error"
              className="mt-1.5 text-xs text-red-600"
              role="alert"
            >
              {errors.password}
            </p>
          )}
        </div>

        {/* ── Forgot password link ─────────────────────────────────── */}
        <div className="flex justify-end">
          <button
            type="button"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:underline"
            disabled={isDisabled}
            onClick={() => {
              // TODO: Wire up password reset flow (Auth0 self-service
              //       password reset or custom reset page)
            }}
          >
            Forgot password?
          </button>
        </div>

        {/* ── Continue button ──────────────────────────────────────── */}
        <button
          type="submit"
          disabled={isDisabled}
          className={`
            inline-flex w-full items-center justify-center gap-2
            rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold
            text-white shadow-sm
            transition-all duration-150
            hover:bg-slate-800
            focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500
            focus-visible:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-60
          `}
        >
          {isLoading ? (
            <>
              <Loader2
                size={18}
                className="animate-spin"
                aria-hidden="true"
              />
              <span>Signing in...</span>
            </>
          ) : (
            'Continue'
          )}
        </button>
      </form>

      {/* ── OR CONTINUE WITH divider ─────────────────────────────────── */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          OR CONTINUE WITH
        </span>
        <div className="h-px flex-1 bg-slate-200" aria-hidden="true" />
      </div>

      {/* ── Alternative login buttons ────────────────────────────────── */}
      <div className="space-y-3">
        <SocialButton
          icon={<Building2 size={18} />}
          label="Wits Staff SSO"
          onClick={handleWitsSSO}
          disabled={isDisabled}
        />
        <SocialButton
          icon={<GoogleIcon />}
          label="Sign in with Google"
          onClick={handleGoogleLogin}
          disabled={isDisabled}
        />
      </div>

      {/* ── Request Access prompt ────────────────────────────────────── */}
      <p className="mt-8 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          className="font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:underline"
          disabled={isDisabled}
          onClick={() => {
            // TODO: Wire up account request flow (e.g. link to a request
            //       form or trigger a custom sign-up flow via Auth0)
          }}
        >
          Request Access
        </button>
      </p>
    </div>
  );
}