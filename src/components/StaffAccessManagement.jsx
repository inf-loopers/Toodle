import { useEffect, useState } from 'react';
import { staffAccessApi } from '../api/staffAccess';
import { coursesApi } from '../api/courses';
import { getApiErrorMessage } from '../utils/apiError';
import Card, { CardBody, CardHeader } from './ui/Card';
import Button from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import FormError from './ui/FormError';
import Modal from './ui/Modal';

function StaffFields({ role, setRole, courseIds, setCourseIds, courses }) {
  return (
    <div className="space-y-4">
      <Select
        label="Staff role"
        value={role}
        onChange={(event) => {
          setRole(event.target.value);
          setCourseIds([]);
        }}
      >
        <option value="LECTURER">Lecturer</option>
        <option value="ADMIN">Administrator</option>
      </Select>
      {role === 'LECTURER' && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Assign courses (optional)</legend>
          <div className="max-h-48 space-y-2 overflow-auto">
            {courses.map((course) => (
              <label key={course.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={courseIds.includes(course.id)}
                  onChange={(event) =>
                    setCourseIds(
                      event.target.checked
                        ? [...courseIds, course.id]
                        : courseIds.filter((id) => id !== course.id)
                    )
                  }
                />
                {course.code} — {course.name}
              </label>
            ))}
          </div>
          {!courses.length && (
            <p className="text-sm">
              No courses available. You can assign courses later from the course page.
            </p>
          )}
        </fieldset>
      )}
      {role === 'ADMIN' && (
        <p className="text-sm text-amber-700">
          Administrators can manage users and access across the platform.
        </p>
      )}
    </div>
  );
}

export default function StaffAccessManagement({ onUsersChanged }) {
  const [access, setAccess] = useState({ requests: [], invitations: [] });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('LECTURER');
  const [courseIds, setCourseIds] = useState([]);
  const [reviewReason, setReviewReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  async function reload() {
    const response = await staffAccessApi.list();
    setAccess(response.data ?? response);
  }
  useEffect(() => {
    let cancelled = false;
    Promise.all([staffAccessApi.list(), coursesApi.getCourses()])
      .then(([staff, available]) => {
        if (cancelled) return;
        setAccess(staff.data ?? staff);
        setCourses(available.data ?? available);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'Could not load staff access.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  function open(request) {
    setForm(request ?? 'invite');
    setEmail('');
    setRole(request?.requestedRole ?? 'LECTURER');
    setCourseIds([]);
    setReviewReason('');
    setFormError('');
    setNotice('');
  }
  async function submit(status) {
    setBusy(true);
    setFormError('');
    try {
      if (form === 'invite') {
        const response = await staffAccessApi.invite({ email, role, courseIds });
        const result = response.data ?? response;
        setNotice(
          result.email.status === 'SENT'
            ? 'Invitation saved and email sent. It expires in 7 days.'
            : `Invitation saved, but the email was ${result.email.status === 'SKIPPED' ? 'not sent because email delivery is not configured' : 'not delivered'}. Share the sign-in link with the invited person: ${result.loginUrl}. They must use ${result.invitation.email} and verify their email.`
        );
      } else {
        await staffAccessApi.review(form.id, { status, role, courseIds, reviewReason });
        setNotice(
          status === 'APPROVED'
            ? 'Staff access approved. The user can check their access status to open their welcome guide.'
            : 'Staff request declined. The user can read your reason.'
        );
      }
      setForm(null);
      await reload();
      await onUsersChanged();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not save staff access.'));
    } finally {
      setBusy(false);
    }
  }
  async function revoke(id) {
    setBusy(true);
    setError('');
    try {
      await staffAccessApi.revoke(id);
      await reload();
      setNotice('Invitation revoked.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not revoke invitation.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="mb-6">
      <CardHeader
        title="Staff invitations and requests"
        description="Invite staff before their first sign-in, or approve people who requested access during onboarding."
      />
      <CardBody>
        <Button onClick={() => open()} disabled={loading || busy || !!error}>
          Invite staff
        </Button>
        {loading && (
          <p role="status" className="mt-3 text-sm">
            Loading staff access…
          </p>
        )}
        <FormError message={error} hint="Use Retry staff access to reload this section." />
        {error && (
          <Button
            variant="secondary"
            onClick={async () => {
              setError('');
              setLoading(true);
              try {
                const [staff, available] = await Promise.all([
                  staffAccessApi.list(),
                  coursesApi.getCourses(),
                ]);
                setAccess(staff.data ?? staff);
                setCourses(available.data ?? available);
              } catch (err) {
                setError(getApiErrorMessage(err, 'Could not load staff access.'));
              } finally {
                setLoading(false);
              }
            }}
          >
            Retry staff access
          </Button>
        )}
        {notice && (
          <p role="status" className="mt-4 text-sm">
            {notice}
          </p>
        )}
        {!loading && !error && (
          <div className="mt-5 space-y-5">
            <section>
              <h3 className="font-semibold">Pending requests ({access.requests.length})</h3>
              {!access.requests.length && (
                <p className="mt-2 text-sm text-slate-500">No staff requests awaiting review.</p>
              )}
              <ul className="mt-2 space-y-3">
                {access.requests.map((request) => (
                  <li key={request.id} className="rounded-xl border border-slate-200 p-3">
                    <p className="font-medium">{request.user.name || request.user.email}</p>
                    <p className="break-words text-sm">
                      {request.user.email} ·{' '}
                      {request.requestedRole === 'ADMIN' ? 'Administrator' : 'Lecturer'}
                    </p>
                    <p className="my-2 whitespace-pre-wrap break-words text-sm">{request.reason}</p>
                    {!request.user.emailVerified && (
                      <p className="mb-2 text-sm text-amber-700">
                        Email verification is required before approval.
                      </p>
                    )}
                    <Button variant="secondary" disabled={busy} onClick={() => open(request)}>
                      Review staff request
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="font-semibold">
                Outstanding invitations ({access.invitations.length})
              </h3>
              {!access.invitations.length && (
                <p className="mt-2 text-sm text-slate-500">No outstanding staff invitations.</p>
              )}
              <ul className="mt-2 space-y-3">
                {access.invitations.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm">
                        {invitation.email} ·{' '}
                        {invitation.role === 'ADMIN' ? 'Administrator' : 'Lecturer'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(invitation.expiresAt) <= new Date() ? 'Expired' : 'Expires'}{' '}
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => revoke(invitation.id)}
                    >
                      Revoke invitation
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
        {form && (
          <Modal
            open
            onClose={() => {
              if (!busy) setForm(null);
            }}
            title={form === 'invite' ? 'Invite staff' : 'Review staff access request'}
          >
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                submit('APPROVED');
              }}
            >
              {form === 'invite' ? (
                <Input
                  label="Institutional email"
                  type="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              ) : (
                <p className="break-words text-sm">
                  Reviewing {form.user.email}. Requested role: {form.requestedRole}.
                </p>
              )}
              <StaffFields
                role={role}
                setRole={setRole}
                courseIds={courseIds}
                setCourseIds={setCourseIds}
                courses={courses}
              />
              {form !== 'invite' && (
                <Textarea
                  label="Decision reason"
                  required
                  maxLength={2000}
                  value={reviewReason}
                  onChange={(event) => setReviewReason(event.target.value)}
                />
              )}
              <FormError message={formError} />
              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  loading={busy}
                  disabled={form !== 'invite' && !form.user.emailVerified}
                >
                  {form === 'invite' ? 'Send invitation' : 'Approve staff access'}
                </Button>
                {form !== 'invite' && (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={busy || !reviewReason.trim()}
                    onClick={() => submit('REJECTED')}
                  >
                    Decline request
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setForm(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </CardBody>
    </Card>
  );
}
