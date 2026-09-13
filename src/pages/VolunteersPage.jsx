/**
 * @file VolunteersPage.jsx
 * @description Volunteer overflow work page with role-split views.
 *
 * Responsibilities:
 * - Organiser view: approval queue with claimant details + open posts grid.
 * - Student/tutor view: browse open posts and claim work.
 * - Course filter dropdown for both views.
 * - Claim status badges: Pending (amber), Approved (green), Rejected (red).
 *
 * Route: `/volunteers`
 */

import { useState } from 'react';
import { Plus, HandHeart, CheckCircle2, Mail, CalendarClock } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { overflowApi } from '../api/overflow';
import { coursesApi } from '../api/courses';
import { useAuth } from '../hooks/useAuth';
import { formatHours, formatShortDate, getInitials } from '../utils/helpers';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import { Select, Input, Textarea } from '../components/ui/Input';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';

const STATUS_TONE = {
  OPEN: 'info',
  CLAIMED: 'warning',
  APPROVED: 'success',
  CLOSED: 'neutral',
  CANCELLED: 'danger',
};

const CLAIM_STATUS_TONE = {
  CLAIMED: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

const CLAIM_STATUS_LABEL = {
  CLAIMED: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

function PostWorkModal({ open, onClose, courses, onCreated }) {
  const [form, setForm] = useState({ courseId: '', hoursPerWeek: 2, description: '' });
  const [submitting, setSubmitting] = useState(false);
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.courseId) return;
    setSubmitting(true);
    try {
      await overflowApi.createPost({ ...form, hoursPerWeek: Number(form.hoursPerWeek) });
      onCreated();
      onClose();
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
  const { isOrganiser } = useAuth();
  const { data, loading, error, refetch } = useApi(overflowApi.getPosts);
  const { data: coursesData } = useApi(coursesApi.getCourses, { immediate: true });
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [courseFilter, setCourseFilter] = useState('');

  const posts = data?.data ?? data ?? [];
  const courses = coursesData?.data ?? coursesData ?? [];

  // Filter posts by selected course
  const filteredPosts = courseFilter
    ? posts.filter((p) => String(p.course?.id ?? p.courseId) === String(courseFilter))
    : posts;

  // Organiser: posts with pending claims
  const pendingClaimsPosts = filteredPosts.filter((p) =>
    p.claims?.some((c) => c.status === 'CLAIMED')
  );

  // Student/tutor: only OPEN posts
  const openPosts = filteredPosts.filter((p) => p.status === 'OPEN');

  const handleClaim = async (postId) => {
    setBusyId(postId);
    try {
      await overflowApi.claimPost(postId);
      refetch();
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveClaim = async (claimId) => {
    setBusyId(claimId);
    try {
      await overflowApi.approveClaim(claimId);
      refetch();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Spinner fullPage label="Loading overflow work…" />;
  if (error) return <ErrorState title="Couldn't load overflow work" description={error} />;

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
      <Card>
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
        <div className="mt-4 border-t border-slate-100 pt-4">
          <Badge tone="primary">{formatHours(post.hoursPerWeek)} / week</Badge>
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Volunteer Overflow</h1>
          <p className="mt-2 text-sm text-slate-500">
            {isOrganiser
              ? 'Post work nobody is allocated to and approve claims.'
              : 'Claim overflow work nobody has taken yet.'}
          </p>
        </div>
        {isOrganiser && (
          <Button onClick={() => setPostModalOpen(true)}>
            <Plus className="h-4 w-4" /> Post work
          </Button>
        )}
      </div>

      {courseFilterBar}

      {/* ══════════════════════════════════════════════════
          ORGANISER VIEW
          ══════════════════════════════════════════════════ */}
      {isOrganiser && (
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
                        const isPending = claim.status === 'CLAIMED';
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

                            {/* Approve action (only for pending claims) */}
                            {isPending && (
                              <div className="mt-3 flex justify-end">
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

          {/* ── Open Posts (organiser can see but not claim) ── */}
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
      {!isOrganiser && (
        <>
          {openPosts.length === 0 ? (
            <EmptyState
              icon={HandHeart}
              title={
                courseFilter ? 'No overflow work for this course' : 'No overflow work right now'
              }
              description={
                courseFilter
                  ? 'Try clearing the filter or check back soon.'
                  : 'Check back soon, or ask your organiser to post new work.'
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {openPosts.map((post) => (
                <PostCardShell key={post.id} post={post}>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
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

      {isOrganiser && (
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
