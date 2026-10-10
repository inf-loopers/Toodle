import FeatureHeading from '../components/layout/FeatureHeading';
/**
 * @file VolunteersPage.jsx
 * @description Volunteer overflow work page with role-split views.
 *
 * Responsibilities:
 * - Staff view: approval queue with claimant details + open posts grid.
 * - Student/tutor view: browse open posts and claim work.
 * - Course filter dropdown for both views.
 * - Claim status badges: Pending (amber), Approved (green), Rejected (red).
 *
 * Route: `/volunteers`
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, HandHeart, CheckCircle2, XCircle, Clock, Mail, CalendarClock } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { overflowApi } from '../api/overflow';
import { coursesApi } from '../api/courses';
import { useAuth } from '../hooks/useAuth';
import { formatHours, formatShortDate, getInitials } from '../utils/helpers';
import OpportunityEligibility from '../components/OpportunityEligibility';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { Select, Input, Textarea } from '../components/ui/Input';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import FormError from '../components/ui/FormError';
import { getApiErrorMessage } from '../utils/apiError';
import { formatDuration, formatOccurrenceDate, formatSessionLabel } from '../utils/excusals';

const STATUS_TONE = {
  OPEN: 'info',
  CLAIMED: 'warning',
  APPROVED: 'success',
  CLOSED: 'neutral',
  CANCELLED: 'danger',
};

const CLAIM_STATUS_TONE = {
  PENDING: 'warning',
  CLAIMED: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

const CLAIM_STATUS_LABEL = {
  PENDING: 'Pending',
  CLAIMED: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

function PostWorkModal({ open, onClose, courses, onCreated }) {
  const [form, setForm] = useState({ courseId: '', hoursPerWeek: 2, description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Start from a clean slate each time the dialog is opened. Resetting on open
  // (rather than after a submit) means a failed post keeps everything typed so
  // far, while a successful one never leaves stale data behind.
  useEffect(() => {
    if (!open) return;
    setForm({ courseId: '', hoursPerWeek: 2, description: '' });
    setError('');
  }, [open]);

  const handleSubmit = async () => {
    if (!form.courseId) return;
    setSubmitting(true);
    setError('');
    try {
      await overflowApi.createPost({ ...form, hoursPerWeek: Number(form.hoursPerWeek) });
      onCreated();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not post the work.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Post overflow work"
      description="Open a slot for tutors or students to volunteer for."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!form.courseId}>
            Post work
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        <Select label="Course" value={form.courseId} onChange={update('courseId')}>
          <option value="">Choose a course…</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </Select>
        <Input
          label="Hours per week"
          type="number"
          min={1}
          value={form.hoursPerWeek}
          onChange={update('hoursPerWeek')}
        />
        <Textarea
          label="Description"
          placeholder="What does this work involve?"
          value={form.description}
          onChange={update('description')}
        />
      </div>
    </Modal>
  );
}

export function VolunteersPage() {
  const { isStaff, dbUser } = useAuth();
  const { data, loading, error, refetch } = useApi(overflowApi.getPosts);
  const { data: coursesData } = useApi(coursesApi.getCourses, { immediate: true });
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [courseFilter, setCourseFilter] = useState('');
  const [actionError, setActionError] = useState('');

  const posts = data?.data ?? data ?? [];
  const courses = coursesData?.data ?? coursesData ?? [];

  // Filter posts by selected course
  const filteredPosts = courseFilter
    ? posts.filter((p) => String(p.course?.id ?? p.courseId) === String(courseFilter))
    : posts;

  // Staff: posts with pending claims
  const pendingClaimsPosts = filteredPosts.filter((p) =>
    p.claims?.some((c) => c.status === 'PENDING' || c.status === 'CLAIMED')
  );

  // Posts the current user has personally claimed (non-staff see these
  // alongside open posts so they can track their claim and record work
  // once it is approved).
  const myClaimedPosts = filteredPosts
    .map((post) => ({
      post,
      claim: post.claims?.find((c) => c.user?.id === dbUser?.id),
    }))
    .filter(({ claim }) => claim);

  // Student/tutor: only OPEN posts they have not already claimed (those
  // appear under My claims instead).
  const openPosts = [...filteredPosts]
    .sort(
      (a, b) =>
        Number(b.eligibility?.status === 'eligible') - Number(a.eligibility?.status === 'eligible')
    )
    .filter((p) => p.status === 'OPEN' && !p.claims?.some((c) => c.user?.id === dbUser?.id));

  const handleClaim = async (postId) => {
    setBusyId(postId);
    setActionError('');
    try {
      await overflowApi.claimPost(postId);
      await refetch();
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Could not claim this work.'));
      await Promise.allSettled([refetch()]);
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveClaim = async (claimId) => {
    setBusyId(claimId);
    setActionError('');
    try {
      await overflowApi.approveClaim(claimId);
      refetch();
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Could not approve this claim.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectClaim = async (claimId) => {
    setBusyId(`reject-${claimId}`);
    setActionError('');
    try {
      await overflowApi.rejectClaim(claimId);
      refetch();
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Could not reject this claim.'));
    } finally {
      setBusyId(null);
    }
  };

  const actionErrorNotice = actionError && (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4"
    >
      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
      <div>
        <p className="text-sm font-medium text-rose-700">{actionError}</p>
        <p className="mt-0.5 text-xs text-rose-500">
          You can try again — if it keeps failing, reload the page for the latest state.
        </p>
      </div>
    </div>
  );

  if (loading) return <Spinner fullPage label="Loading overflow work…" />;
  if (error)
    return (
      <>
        {actionErrorNotice}
        <ErrorState
          title="Couldn't load overflow work"
          description={error}
          action={<Button onClick={refetch}>Try again</Button>}
        />
      </>
    );

  // --- Course filter dropdown (shared by both views) ---
  const courseFilterBar = courses.length > 0 && (
    <div className="mb-6 max-w-xs">
      <Select
        label="Filter by course"
        value={courseFilter}
        onChange={(e) => setCourseFilter(e.target.value)}
      >
        <option value="">All courses</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.code} — {c.name}
          </option>
        ))}
      </Select>
    </div>
  );

  // --- Shared post card header (icon + course info + hours badge) ---
  function PostCardShell({ post, children }) {
    return (
      <Card className={post.approvalEligibility?.status === 'ineligible' ? 'bg-slate-50' : ''}>
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <HandHeart className="h-5 w-5" />
          </div>
          <Badge tone={STATUS_TONE[post.status] || 'neutral'}>{post.status}</Badge>
        </div>
        <h3 className="mt-4 font-bold text-slate-900">{post.course?.code || post.courseId}</h3>
        <p className="text-sm text-slate-500">{post.course?.name}</p>
        <p className="mt-2 text-xs text-slate-400">
          {post.description || 'No description provided.'}
        </p>
        {post.sessionDate && (
          <p className="mt-2 text-xs font-medium text-slate-600">
            Covers {post.session ? `${formatSessionLabel(post.session)} · ` : ''}
            {formatOccurrenceDate(post.sessionDate)}
          </p>
        )}
        <div className="mt-4 border-t border-slate-100 pt-4">
          {post.durationMinutes ? (
            <Badge tone="primary">{formatDuration(post.durationMinutes)} · one session</Badge>
          ) : (
            <Badge tone="primary">
              {formatHours(post.hoursPerWeek ?? post.hoursNeeded)} / week
            </Badge>
          )}
          {children}
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* ── Page header ── */}
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <FeatureHeading className="text-3xl font-bold tracking-tight text-slate-900">
            Volunteer Overflow
          </FeatureHeading>
          <p className="mt-2 text-sm text-slate-500">
            {isStaff
              ? 'Post work nobody is allocated to and approve claims.'
              : 'Claim overflow work nobody has taken yet.'}
          </p>
        </div>
        {isStaff && (
          <Button onClick={() => setPostModalOpen(true)}>
            <Plus className="h-4 w-4" /> Post work
          </Button>
        )}
      </div>

      {actionErrorNotice}
      {courseFilterBar}

      {/* ══════════════════════════════════════════════════
          STAFF VIEW
          ══════════════════════════════════════════════════ */}
      {isStaff && (
        <>
          {/* ── Approval Queue ── */}
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Approval Queue</h2>

            {pendingClaimsPosts.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No pending claims"
                description="All claims have been reviewed. Nicely done!"
              />
            ) : (
              <div className="space-y-5">
                {pendingClaimsPosts.map((post) => (
                  <Card key={post.id}>
                    {/* Post summary row */}
                    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 pb-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                        <HandHeart className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-slate-900">
                          {post.course?.code || post.courseId}
                        </span>
                        <span className="ml-2 text-sm text-slate-500">{post.course?.name}</span>
                      </div>
                      <Badge tone="primary">{formatHours(post.hoursPerWeek)} / week</Badge>
                    </div>

                    {/* Claims list */}
                    <p className="mt-3 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Claims ({post.claims.length})
                    </p>
                    <div className="space-y-2">
                      {post.claims.map((claim) => {
                        const isPending = claim.status === 'PENDING' || claim.status === 'CLAIMED';
                        return (
                          <div
                            key={claim.id}
                            className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                          >
                            <div className="flex flex-wrap items-center gap-3">
                              {/* Avatar + name */}
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                                {getInitials(claim.user?.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                  {claim.user?.name || 'Unknown'}
                                </p>
                                {/* Claimant email */}
                                {claim.user?.email && (
                                  <div className="flex items-center gap-1 text-xs text-slate-500">
                                    <Mail className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{claim.user.email}</span>
                                  </div>
                                )}
                              </div>

                              {/* Claimed date */}
                              {claim.claimedAt && (
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                  <CalendarClock className="h-3 w-3" />
                                  {formatShortDate(claim.claimedAt)}
                                </div>
                              )}

                              {/* Status badge */}
                              <Badge tone={CLAIM_STATUS_TONE[claim.status] || 'neutral'}>
                                {CLAIM_STATUS_LABEL[claim.status] || claim.status}
                              </Badge>
                            </div>

                            {/* Approve / reject actions (only for pending claims) */}
                            {isPending && (
                              <div className="mt-3 flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => handleRejectClaim(claim.id)}
                                  loading={busyId === `reject-${claim.id}`}
                                >
                                  <XCircle className="h-3.5 w-3.5" /> Reject
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleApproveClaim(claim.id)}
                                  loading={busyId === claim.id}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* ── Open Posts (staff can see but not claim) ── */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Open Posts</h2>
            {openPosts.length === 0 ? (
              <EmptyState
                icon={HandHeart}
                title={courseFilter ? 'No open posts for this course' : 'No open posts right now'}
                description={
                  courseFilter
                    ? 'Try clearing the course filter or posting new work.'
                    : 'Post new overflow work for tutors and students to claim.'
                }
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {openPosts.map((post) => (
                  <PostCardShell key={post.id} post={post} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ══════════════════════════════════════════════════
          STUDENT / TUTOR VIEW
          ══════════════════════════════════════════════════ */}
      {!isStaff && (
        <>
          {/* ── My claims ── */}
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">My claims</h2>

            {myClaimedPosts.length === 0 ? (
              <EmptyState
                icon={HandHeart}
                title="You haven't claimed any work yet"
                description="Claim open overflow work below and track its review status here."
              />
            ) : (
              <div className="space-y-4">
                {myClaimedPosts.map(({ post, claim }) => (
                  <Card key={post.id}>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                        <HandHeart className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-slate-900">
                          {post.course?.code || post.courseId}
                        </span>
                        <span className="ml-2 text-sm text-slate-500">{post.course?.name}</span>
                        {post.description && (
                          <p className="mt-1 text-xs text-slate-400">{post.description}</p>
                        )}
                      </div>
                      <Badge tone={CLAIM_STATUS_TONE[claim.status] || 'neutral'}>
                        {CLAIM_STATUS_LABEL[claim.status] || claim.status}
                      </Badge>
                    </div>

                    {claim.status === 'APPROVED' && (
                      <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
                        <Button as={Link} to="/timesheets" size="sm">
                          <Clock className="h-3.5 w-3.5" /> Record hours
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* ── Open posts ── */}
          {openPosts.length === 0 ? (
            <EmptyState
              icon={HandHeart}
              title={
                courseFilter ? 'No overflow work for this course' : 'No overflow work right now'
              }
              description={
                courseFilter
                  ? 'Try clearing the filter or check back soon.'
                  : 'Check back soon, or ask your course coordinator to post new work.'
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {openPosts.map((post) => (
                <PostCardShell key={post.id} post={post}>
                  <OpportunityEligibility
                    eligibility={post.eligibility}
                    label="Eligible to claim"
                    courseId={post.courseId ?? post.course?.id}
                  />
                  {post.approvalEligibility && (
                    <>
                      <p className="text-xs font-semibold">Approval readiness</p>
                      <OpportunityEligibility
                        eligibility={post.approvalEligibility}
                        courseId={post.courseId ?? post.course?.id}
                        label="Ready for approval"
                      />
                    </>
                  )}
                  {post.eligibility?.status === 'eligible' &&
                    post.approvalEligibility?.status !== 'eligible' &&
                    post.approvalEligibility && (
                      <p className="text-xs text-slate-500">
                        You may submit a claim for review. Resolve the approval checks before you
                        can be assigned.
                      </p>
                    )}
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      disabled={post.eligibility?.status !== 'eligible'}
                      onClick={() => handleClaim(post.id)}
                      loading={busyId === post.id}
                    >
                      Claim
                    </Button>
                  </div>
                </PostCardShell>
              ))}
            </div>
          )}
        </>
      )}

      {isStaff && (
        <PostWorkModal
          open={postModalOpen}
          onClose={() => setPostModalOpen(false)}
          courses={courses}
          onCreated={refetch}
        />
      )}
    </>
  );
}

export default VolunteersPage;
