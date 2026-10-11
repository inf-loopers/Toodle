import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usersApi } from '../api/users';
import { staffAccessApi } from '../api/staffAccess';
import { getApiErrorMessage } from '../utils/apiError';
import Card, { CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import FormError from '../components/ui/FormError';
import LogoutButton from '../components/auth/LogoutButton';

export default function StaffWelcomePage({ previewSession } = {}) {
  const { dbUser, isLoading, updateDbUser } = useAuth();
  const profile = previewSession?.profile ?? dbUser;
  const navigate = useNavigate();
  const [name, setName] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (isLoading || !profile) return <Spinner fullPage label="Loading your welcome guide…" />;
  const role = profile.role.toUpperCase();
  if (!['ADMIN', 'LECTURER'].includes(role)) return <Navigate to="/onboarding" replace />;
  const isAdmin = role === 'ADMIN';
  const courses = profile.coordinatedCourses ?? [];
  async function finish(destination) {
    setBusy(true);
    setError('');
    try {
      if (previewSession) {
        previewSession.onFinish(destination);
        return;
      }
      await staffAccessApi.complete({ role, name: (name ?? profile.name ?? '').trim() });
      const response = await usersApi.getCurrentUser();
      updateDbUser(response.data ?? response);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save your welcome preferences.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="text-3xl font-bold">
        Welcome to Toodle, {isAdmin ? 'Administrator' : 'Lecturer'}
      </h1>
      <Card>
        <CardHeader
          title="Confirm your profile"
          description={`Your ${isAdmin ? 'administrator' : 'lecturer'} access is ready. Signed in as ${profile.email}.`}
        />
        <CardBody>
          <Input
            label="Name"
            maxLength={200}
            value={name ?? profile.name ?? ''}
            onChange={(event) => setName(event.target.value)}
          />
        </CardBody>
      </Card>
      {!isAdmin && (
        <Card>
          <CardHeader title="Your assigned courses" />
          <CardBody>
            {courses.length ? (
              <ul className="space-y-2">
                {courses.map(({ course }) => (
                  <li key={course.id}>
                    {course.code} — {course.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                Your account is ready. An administrator needs to assign your courses. You can still
                open your profile, dashboard and help guide.
              </p>
            )}
          </CardBody>
        </Card>
      )}
      <Card>
        <CardHeader
          title="Get started"
          description="You can revisit these steps from Help at any time."
        />
        <CardBody>
          <ol className="list-decimal space-y-3 pl-5">
            {isAdmin ? (
              <>
                <li>Open Users to invite staff, review access requests and manage roles.</li>
                <li>Create courses and assign lecturers as course coordinators.</li>
                <li>Review course sessions, staffing requirements and allocations.</li>
                <li>Use Reports to review staffing, budgets and payment information.</li>
              </>
            ) : (
              <>
                <li>Open My Courses and check the courses you coordinate.</li>
                <li>Review course requirements and add or update teaching sessions.</li>
                <li>Verify applicants’ marks against school records and review applications.</li>
                <li>Check tutor allocations and review submitted timesheets.</li>
              </>
            )}
          </ol>
        </CardBody>
      </Card>
      <FormError message={error} />
      <div className="flex flex-wrap gap-3">
        <Button
          loading={busy}
          disabled={!(name ?? profile.name ?? '').trim()}
          onClick={() => finish('/help')}
        >
          Save and open guided help
        </Button>
        <Button
          variant="secondary"
          disabled={busy || !(name ?? profile.name ?? '').trim()}
          onClick={() => finish('/dashboard')}
        >
          Save and go to dashboard
        </Button>
        {!previewSession && (
          <>
            <Link to="/profile" className="self-center text-sm text-primary underline">
              My profile
            </Link>
            <LogoutButton />
          </>
        )}
      </div>
    </main>
  );
}
