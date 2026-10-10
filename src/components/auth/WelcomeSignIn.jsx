import { useId, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, LoaderCircle, Mail } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function WelcomeSignIn() {
  const { login, isLoading } = useAuth();
  const location = useLocation();
  const id = useId();
  const emailRef = useRef(null);
  const pendingRef = useRef(false);
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  const [invalidEmail, setInvalidEmail] = useState(false);
  const returnTo = typeof location.state?.from === 'string' ? location.state.from : '/dashboard';

  async function openSignIn(method) {
    if (pendingRef.current || isLoading) return;
    if (method !== 'google' && !emailRef.current.reportValidity()) return;
    const authorizationParams = {};
    if (method === 'google') authorizationParams.connection = 'google-oauth2';
    else {
      if (email.trim()) authorizationParams.login_hint = email.trim();
      if (method === 'signup') authorizationParams.screen_hint = 'signup';
    }
    pendingRef.current = true;
    setPending(method);
    setError('');
    try {
      await login({
        appState: { returnTo },
        ...(Object.keys(authorizationParams).length ? { authorizationParams } : {}),
      });
    } catch {
      setError(
        method === 'google'
          ? 'We couldn’t open Google sign-in. Please try again.'
          : 'We couldn’t open sign-in. Please try again.'
      );
    } finally {
      pendingRef.current = false;
      setPending(null);
    }
  }

  const disabled = isLoading || !!pending;
  return (
    <form
      className="welcome-signin-card"
      aria-busy={!!pending}
      onSubmit={(event) => {
        event.preventDefault();
        openSignIn('email');
      }}
    >
      <label className="sr-only" htmlFor={`${id}-email`}>
        Email address
      </label>
      <div className="welcome-email-field">
        <Mail size={18} aria-hidden="true" />
        <input
          ref={emailRef}
          id={`${id}-email`}
          className="welcome-email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          placeholder="Email address"
          value={email}
          disabled={disabled}
          aria-invalid={invalidEmail || undefined}
          aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
          onChange={(event) => {
            setEmail(event.target.value);
            setInvalidEmail(false);
            setError('');
          }}
          onInvalid={() => {
            setInvalidEmail(true);
            setError('Enter a valid email address, or leave it blank to continue.');
          }}
        />
      </div>
      <p id={`${id}-help`} className="welcome-password-hint">
        You’ll enter your password on the next screen.
      </p>
      {error && (
        <p id={`${id}-error`} className="welcome-signin-alert" role="alert">
          {error}
        </p>
      )}
      <button type="submit" data-welcome-signin disabled={disabled}>
        Sign in or sign up
        {pending === 'email' ? (
          <LoaderCircle size={18} aria-hidden="true" className="animate-spin" />
        ) : (
          <ArrowRight size={18} aria-hidden="true" />
        )}
      </button>
      <div className="welcome-signin-divider" aria-hidden="true">
        <span>or</span>
      </div>
      <button
        type="button"
        className="welcome-google"
        disabled={disabled}
        onClick={() => openSignIn('google')}
      >
        {pending === 'google' ? (
          <LoaderCircle size={20} aria-hidden="true" className="animate-spin" />
        ) : (
          <GoogleMark />
        )}
        Continue with Google
      </button>
      <p className="welcome-signup-prompt">
        New to Toodle?{' '}
        <button type="button" disabled={disabled} onClick={() => openSignIn('signup')}>
          Create an account
        </button>
      </p>
    </form>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.73-.06-1.42-.19-2.09H12v3.96h5.92c-.26 1.28-1.04 2.36-2.21 3.08v2.56h3.57c2.09-1.92 3.28-4.75 3.28-7.51z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.67l-3.57-2.56c-.98.66-2.25 1.06-3.71 1.06-2.86 0-5.28-1.93-6.15-4.53H2.18v2.64C3.99 20.53 7.69 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.85 14.3c-.22-.66-.35-1.36-.35-2.08s.13-1.42.35-2.08V7.5H2.18C1.43 8.92 1 10.52 1 12.22s.43 3.3 1.18 4.72l3.67-2.64z"
      />
      <path
        fill="#EA4335"
        d="M12 5.5c1.62 0 3.07.56 4.22 1.64l3.16-3.16C17.43 2.08 14.97 1.22 12 1.22 7.69 1.22 3.99 3.69 2.18 7.5l3.67 2.64C6.72 7.54 9.14 5.5 12 5.5z"
      />
    </svg>
  );
}
