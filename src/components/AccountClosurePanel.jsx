import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersApi } from '../api/users';
import { getApiErrorMessage } from '../utils/apiError';
import Card, { CardBody, CardHeader } from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import FormError from './ui/FormError';
import { Input } from './ui/Input';

export default function AccountClosurePanel({ email, logout }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setConfirmation('');
    setError('');
    setPreview(null);
    setLoading(true);
    usersApi
      .getAccountClosure()
      .then((response) => {
        if (cancelled) return;
        const status = response.data ?? response;
        if (status.accountStatus !== 'ACTIVE') setResult(status);
        else setPreview(status);
      })
      .catch((err) => {
        if (!cancelled)
          setError(getApiErrorMessage(err, 'Could not check your account. Please try again.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const closeAccount = async () => {
    setSubmitting(true);
    setError('');
    try {
      const response = await usersApi.closeCurrentAccount(confirmation);
      setResult(response.data ?? response);
    } catch (err) {
      // A response can be lost after closure commits. Check durable status
      // before telling the user their account is still open.
      try {
        const response = await usersApi.getAccountClosure();
        const status = response.data ?? response;
        if (status.accountStatus !== 'ACTIVE') {
          setResult(status);
          return;
        }
        setPreview(status);
      } catch {
        /* Show the original request error; never claim success. */
      }
      setError(
        getApiErrorMessage(err, 'Could not confirm closure. Check your connection and try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const matches =
    confirmation.trim().toLowerCase() === email.trim().toLowerCase() && confirmation.trim() !== '';
  return (
    <>
      <Card className="mt-6">
        <CardHeader title="Close account" description="Permanently end your access to Toodle." />
        <CardBody>
          <p className="mb-4 text-sm text-slate-500">
            Your profile details and sign-in will be removed. Academic, swap, cover, payroll and
            audit history stays linked to a closed account. This cannot be undone.
          </p>
          <Button variant="danger" onClick={() => setOpen(true)}>
            Close account
          </Button>
        </CardBody>
      </Card>
      <Modal
        open={open}
        onClose={() => {
          if (!submitting && !result) setOpen(false);
        }}
        title={result ? 'Account access closed' : 'Close your account?'}
        description="Academic and payroll history will be preserved."
        footer={
          result ? (
            <Button onClick={logout}>Sign out</Button>
          ) : (
            <>
              <Button variant="secondary" disabled={submitting} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={submitting}
                disabled={loading || !preview?.canClose || !matches}
                onClick={closeAccount}
              >
                Close permanently
              </Button>
            </>
          )
        }
      >
        {result ? (
          <div role="status" className="space-y-3 text-sm">
            <p>
              Your Toodle access is permanently blocked. Your academic and payroll history has been
              retained.
            </p>
            {result.signInRemovalPending ? (
              <p>
                Sign-in removal is pending. Scheduled cleanup or an administrator can retry it. Your
                account stays closed during this process.
              </p>
            ) : (
              <p>Your sign-in identity has been removed.</p>
            )}
            {result.cleanupPending && !result.signInRemovalPending && (
              <p>Profile photo cleanup is still pending. An administrator can retry it.</p>
            )}
            <p>Sign out to clear this browser session.</p>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <p>
              Your name, email, student number, profile photo and availability will be removed from
              your active profile. Calendar links will stop working. Historical records and their
              existing snapshots may retain information needed for academic and payroll records.
            </p>
            <p>
              Ordinary allocations will be retired and pending requests cancelled. Administrators
              will receive a handover notice. Save any records you need before continuing.
            </p>
            {loading && <p role="status">Checking outstanding work…</p>}
            {preview?.blockers?.length > 0 && (
              <div role="alert">
                <p className="font-semibold">Before closing your account:</p>
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  {preview.blockers.map((item) => (
                    <li key={item.code}>
                      {item.message}{' '}
                      {item.href && (
                        <Link className="text-primary underline" to={item.href}>
                          Review
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Input
              label={`Type your email (${email}) to confirm`}
              type="email"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              disabled={submitting}
            />
            <FormError message={error} hint={null} />
          </div>
        )}
      </Modal>
    </>
  );
}
