import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { coursesApi } from '../api/courses';
import { tutorsApi } from '../api/tutors';
import { usersApi } from '../api/users';
import Card from './ui/Card';
import Button from './ui/Button';
import { Input, Textarea } from './ui/Input';

const message = (err) => err?.response?.data?.error || err?.response?.data?.message || err.message;

function ApplicationReview({ application, course, run, busy }) {
  const [reason, setReason] = useState('');
  const mark = application.user?.tutorMarks?.[0];
  const eligibility = application.eligibility;
  const canApprove =
    eligibility &&
    !eligibility.warnings.length &&
    course.applicationsOpen &&
    course.sessions?.length > 0;
  return (
    <article className="space-y-3 rounded-xl border border-slate-200 p-4">
      <p className="font-semibold">
        {application.user?.name || application.user?.email} — {application.status}
      </p>
      <p>
        {application.hoursPerWeek}h requested / week. Mark:{' '}
        {mark ? `${mark.mark}% (${mark.status})` : 'Not submitted'}; minimum{' '}
        {course.minMarkRequired}%.
      </p>
      {application.motivation && <p>Motivation: {application.motivation}</p>}
      {eligibility && <p>{eligibility.remainingHours}h remaining before this assignment.</p>}
      {eligibility?.warnings.map((warning, index) => (
        <p key={index} className="text-rose-700">
          {warning.message}
        </p>
      ))}
      {application.reason && <p>Decision: {application.reason}</p>}
      {application.status === 'PENDING' && (
        <>
          <Textarea
            label={`Review reason for ${application.user?.name || application.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {mark?.status === 'PENDING' && (
            <div className="flex gap-2">
              <Button
                disabled={busy}
                onClick={() => run(() => tutorsApi.reviewMark(mark.id, { status: 'VERIFIED' }))}
              >
                Verify mark
              </Button>
              <Button
                variant="secondary"
                disabled={busy || !reason.trim()}
                onClick={() =>
                  run(() =>
                    tutorsApi.reviewMark(mark.id, {
                      status: 'REJECTED',
                      rejectionReason: reason.trim(),
                    })
                  )
                }
              >
                Reject mark
              </Button>
            </div>
          )}
          {!course.applicationsOpen && <p>Reopen applications before approving.</p>}
          {!course.sessions?.length && <p>Add course sessions before approving.</p>}
          <div className="flex gap-2">
            <Button
              disabled={busy || !reason.trim() || !canApprove}
              onClick={() =>
                run(() =>
                  coursesApi.reviewApplication(course.id, application.id, {
                    status: 'APPROVED',
                    reason: reason.trim(),
                  })
                )
              }
            >
              Approve application
            </Button>
            <Button
              variant="secondary"
              disabled={busy || !reason.trim()}
              onClick={() =>
                run(() =>
                  coursesApi.reviewApplication(course.id, application.id, {
                    status: 'REJECTED',
                    reason: reason.trim(),
                  })
                )
              }
            >
              Reject application
            </Button>
          </div>
        </>
      )}
    </article>
  );
}

export default function CourseApplications({ course, onUpdated }) {
  const { dbUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  // Admins review every course; lecturers only the ones they coordinate.
  const canReview =
    isAdmin || (course.coordinators ?? []).some((c) => (c.userId ?? c.user?.id) === dbUser?.id);
  const { data, loading, error, refetch } = useApi(coursesApi.getApplications, {
    params: [course.id],
  });
  const { data: profile, refetch: refetchProfile } = useApi(usersApi.getCurrentUser, {
    immediate: !canReview,
  });
  const [hours, setHours] = useState(2);
  const [mark, setMark] = useState('');
  const [motivation, setMotivation] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const applications = data?.data ?? data ?? [];
  const ownMark = (profile?.data ?? profile)?.tutorMarks?.find(
    (item) => item.courseId === course.id
  );

  const run = async (action) => {
    setBusy(true);
    setActionError('');
    setNotice('');
    try {
      await action();
      await Promise.all([refetch(), onUpdated(), ...(!canReview ? [refetchProfile()] : [])]);
      setNotice('Saved. The latest application checks are shown below.');
    } catch (err) {
      setActionError(message(err));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    setActionError('');
    try {
      await coursesApi.deleteCourse(course.id);
      navigate('/courses');
    } catch (err) {
      setActionError(message(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-6 space-y-4 text-sm">
      <h2 className="text-xl font-bold">Tutor applications</h2>
      <p>Applications are {course.applicationsOpen ? 'open' : 'closed'}.</p>
      {canReview ? (
        <>
          <p>
            Add sessions, open applications, verify applicants' marks against school records, then
            review their availability and weekly hours. Approval creates an active allocation.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={busy}
              onClick={() =>
                run(() =>
                  coursesApi.updateCourse(course.id, { applicationsOpen: !course.applicationsOpen })
                )
              }
            >
              {course.applicationsOpen ? 'Close applications' : 'Open applications'}
            </Button>
            {isAdmin && (
              <Button variant="secondary" disabled={busy} onClick={() => setConfirmDelete(true)}>
                Remove course
              </Button>
            )}
          </div>
          {confirmDelete && (
            <div className="space-y-3 rounded-xl border border-rose-200 p-4">
              <p>
                Remove {course.code} and its sessions? Courses with applications, marks, assignments
                or financial history cannot be removed. Close applications to retain them.
              </p>
              <Button disabled={busy} onClick={remove}>
                Confirm removal
              </Button>{' '}
              <Button variant="secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>
                Cancel removal
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <p>
            <Link className="text-primary underline" to="/profile">
              Set your free time and weekly hours in your profile
            </Link>
            , submit your course mark, then apply. A course coordinator checks your mark before
            approving.
          </p>
          {ownMark && (
            <p>
              Your recorded mark: {ownMark.mark}% — {ownMark.status}. {ownMark.rejectionReason}
            </p>
          )}
          <Input
            label="Your course mark (%)"
            type="number"
            min={0}
            max={100}
            value={mark}
            onChange={(e) => setMark(e.target.value)}
          />
          <Button
            disabled={
              busy ||
              mark === '' ||
              !Number.isInteger(Number(mark)) ||
              Number(mark) < 0 ||
              Number(mark) > 100
            }
            onClick={() =>
              run(() => tutorsApi.submitMark({ courseId: course.id, mark: Number(mark) }))
            }
          >
            Submit mark for verification
          </Button>
          {applications.length === 0 && course.applicationsOpen && !loading && !error && (
            <>
              <Input
                label="Requested hours per week"
                type="number"
                min={1}
                max={40}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
              <Textarea
                label="Why would you like to tutor this course?"
                maxLength={2000}
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
              />
              <Button
                disabled={
                  busy ||
                  !motivation.trim() ||
                  !Number.isInteger(Number(hours)) ||
                  Number(hours) < 1 ||
                  Number(hours) > 40
                }
                onClick={() =>
                  run(() =>
                    coursesApi.apply(course.id, {
                      hoursPerWeek: Number(hours),
                      motivation: motivation.trim(),
                    })
                  )
                }
              >
                Apply to tutor
              </Button>
            </>
          )}
        </>
      )}
      {loading && <p>Loading applications...</p>}
      {error && <p role="alert">{error}</p>}
      {actionError && (
        <p role="alert" className="text-rose-700">
          {actionError}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <Button variant="secondary" disabled={busy || loading} onClick={() => run(async () => {})}>
        Refresh applications
      </Button>
      {!loading && !error && applications.length === 0 && <p>No applications yet.</p>}
      {applications.map((application) =>
        canReview ? (
          <ApplicationReview
            key={application.id}
            application={application}
            course={course}
            run={run}
            busy={busy}
          />
        ) : (
          <article key={application.id} className="space-y-2 rounded-xl border p-4">
            <p>
              Your application: {application.status} — {application.hoursPerWeek}h / week
            </p>
            {application.reason && <p>Coordinator's reason: {application.reason}</p>}
            {application.eligibility && (
              <p>{application.eligibility.remainingHours}h remaining before this assignment.</p>
            )}
            {application.eligibility?.warnings.map((warning, index) => (
              <p key={index}>{warning.message}</p>
            ))}
            {application.status === 'PENDING' && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => run(() => coursesApi.withdrawApplication(course.id, application.id))}
              >
                Withdraw application
              </Button>
            )}
            {application.status === 'APPROVED' && (
              <p>
                You are assigned. Reload the app to refresh your tutor role, then visit your
                dashboard.
              </p>
            )}
            {['REJECTED', 'WITHDRAWN'].includes(application.status) && (
              <p>Reapplication is not supported yet. Contact your course coordinator.</p>
            )}
          </article>
        )
      )}
    </Card>
  );
}
