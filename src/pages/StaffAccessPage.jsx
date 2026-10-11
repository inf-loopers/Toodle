import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usersApi } from '../api/users';
import { staffAccessApi } from '../api/staffAccess';
import { getApiErrorMessage } from '../utils/apiError';
import Card, { CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Select, Textarea } from '../components/ui/Input';
import FormError from '../components/ui/FormError';
import Spinner from '../components/ui/Spinner';
import LogoutButton from '../components/auth/LogoutButton';

export default function StaffAccessPage() {
  const { dbUser, isLoading, updateDbUser } = useAuth();
  const [requestedRole, setRequestedRole] = useState('LECTURER');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  if (isLoading || !dbUser) return <Spinner fullPage label="Loading your account…" />;
  if (['ADMIN', 'LECTURER'].includes(dbUser.role.toUpperCase())) {
    return <Navigate to={dbUser.staffWelcomeRequired ? '/staff-welcome' : '/dashboard'} replace />;
  }
  if (dbUser.role.toUpperCase() !== 'STUDENT') return <Navigate to="/dashboard" replace />;
  const request = dbUser.staffAccessRequest;
  const pending = request?.status === 'PENDING';
  async function run(action, message) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      const response = await usersApi.getCurrentUser();
      updateDbUser(response.data ?? response);
      setNotice(message);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not update your staff access.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader
          title={pending ? 'Your staff access request is pending' : 'Request staff access'}
          description="Lecturers and administrators do not need student marks or tutoring availability. An administrator must approve your access."
        />
        <CardBody>
          <p className="mb-4 text-sm">Signed in as {dbUser.email}.</p>
          {dbUser.emailVerified === false && (
            <p className="mb-4 text-sm text-amber-700">
              Verify your sign-in email, then sign out and sign in again before your request can be
              approved.
            </p>
          )}
          {request?.status === 'REJECTED' && (
            <p className="mb-4 text-sm">
              Your previous request was declined: {request.reviewReason}
            </p>
          )}
          <FormError message={error} />
          {notice && (
            <p role="status" className="mb-4 text-sm">
              {notice}
            </p>
          )}
          {pending ? (
            <div className="space-y-4">
              <p>
                Requested access: {request.requestedRole === 'ADMIN' ? 'Administrator' : 'Lecturer'}
                . You can check the decision here without completing student onboarding.
              </p>
              <Button
                disabled={busy}
                onClick={() =>
                  run(
                    () => usersApi.syncUser({}),
                    'Account checked. If your request is still pending, an administrator has not approved it yet.'
                  )
                }
              >
                Check access status
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  run(staffAccessApi.cancel, 'Request cancelled. You can continue as a student.')
                }
              >
                Cancel staff request
              </Button>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                run(
                  () => staffAccessApi.request({ requestedRole, reason }),
                  'Your request has been sent to administrators.'
                );
              }}
            >
              <Select
                label="Requested role"
                value={requestedRole}
                onChange={(event) => setRequestedRole(event.target.value)}
              >
                <option value="LECTURER">Lecturer</option>
                <option value="ADMIN">Administrator</option>
              </Select>
              <Textarea
                label="Department and reason for access"
                required
                minLength={10}
                maxLength={2000}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <Button type="submit" loading={busy}>
                Submit staff request
              </Button>
              <p className="text-sm">
                Already invited? Use your invited email address and verify it, then{' '}
                <button
                  type="button"
                  className="text-primary underline"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => usersApi.syncUser({}),
                      'Invitation checked. Make sure you are signed in with the verified email address that was invited.'
                    )
                  }
                >
                  check your invitation
                </button>
                .
              </p>
            </form>
          )}
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            {!pending && (
              <Link to="/onboarding" className="text-primary underline">
                Continue as a student
              </Link>
            )}
            <a href="mailto:toodle.issues@gmail.com" className="text-primary underline">
              Contact support
            </a>
            <LogoutButton />
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
