import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../hooks/useAuth';
import { usersApi } from '../api/users';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

export default function RegisterAgainPage() {
  const { isAuthenticated, isLoading, user, login, logout, updateDbUser } = useAuth();
  const { getIdTokenClaims } = useAuth0();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [proof, setProof] = useState(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    const check = async () => {
      try {
        const response = await usersApi.getAccountClosure();
        const closure = response.data ?? response;
        if (cancelled) return;
        if (closure.accountStatus === 'ACTIVE') {
          navigate('/dashboard', { replace: true });
          return;
        }
        setStatus(closure);
        const claims = await getIdTokenClaims();
        if (!cancelled) setProof(claims ?? null);
      } catch (err) {
        if (!cancelled)
          setError(err?.response?.data?.error || 'Could not check your account. Try again later.');
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, getIdTokenClaims, navigate]);

  const freshSignIn = async () => {
    setError('');
    setBusy(true);
    try {
      await login({
        appState: { returnTo: '/register-again' },
        authorizationParams: {
          prompt: 'login',
          max_age: 0,
          ...(user?.sub?.startsWith('google-oauth2|') ? { connection: 'google-oauth2' } : {}),
          ...(user?.email ? { login_hint: user.email } : {}),
        },
      });
    } catch (err) {
      setError(err?.message || 'Could not start sign-in.');
      setBusy(false);
    }
  };

  const fresh = Boolean(
    proof?.__raw &&
    Number.isFinite(proof.auth_time) &&
    proof.auth_time * 1000 > new Date(status?.registrationAfter).getTime() &&
    proof.auth_time * 1000 > Date.now() - 15 * 60 * 1000
  );
  const emailMatches = Boolean(
    user?.email && email.trim().toLowerCase() === user.email.trim().toLowerCase()
  );

  const createAccount = async (event) => {
    event.preventDefault();
    if (!accepted || !emailMatches || !fresh || !status?.canRegisterAgain || busy) return;
    setBusy(true);
    setError('');
    try {
      await usersApi.registerAgain(email.trim(), proof.__raw);
      const response = await usersApi.getCurrentUser();
      const profile = response.data ?? response;
      updateDbUser({ ...profile, role: (profile.role ?? 'student').toLowerCase() });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err?.response?.status === 401) setProof(null);
      setError(
        err?.response?.data?.error || 'Could not finish registration. You can safely try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || checking) return <Spinner fullPage label="Checking your account…" />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-lg space-y-5 rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Create a new account</h1>
        <p className="text-sm text-slate-600">
          You can return using your previous email or Google sign-in. Your closed account’s academic
          and payroll history stays archived.
        </p>
        <p className="text-sm text-slate-600">
          Your new account starts as Student with fresh onboarding. Marks, allocations and previous
          permissions are not transferred. Lecturer or Admin access needs new approval.
        </p>
        {error && (
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        )}
        {status && !status.canRegisterAgain && (
          <p role="status" className="text-sm text-amber-700">
            Account cleanup is still pending. Ask an administrator to finish cleanup before creating
            a new account.
          </p>
        )}
        {(!isAuthenticated || (status?.canRegisterAgain && !fresh)) && (
          <Button onClick={freshSignIn} loading={busy}>
            Sign in again to continue
          </Button>
        )}
        {status?.canRegisterAgain && fresh && (
          <form onSubmit={createAccount} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Type your sign-in email to confirm
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                disabled={busy}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                disabled={busy}
                className="mt-1"
              />
              I understand this creates a new Student account and leaves my closed account’s history
              archived.
            </label>
            <Button type="submit" loading={busy} disabled={!accepted || !emailMatches}>
              Create new Student account
            </Button>
          </form>
        )}
        {isAuthenticated && (
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className="block text-sm font-medium text-slate-600 underline"
          >
            Sign out
          </button>
        )}
      </section>
    </main>
  );
}
