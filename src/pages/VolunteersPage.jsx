/**
 * @file VolunteersPage.jsx
 * @description Volunteer registration and management page.
 *
 * Responsibilities:
 * - Lists registered volunteers with contact info and course interests.
 * - Shows volunteer availability and preferred subjects.
 * - Status tracking: pending review, active, or inactive.
 * - Quick actions to approve or archive volunteers.
 *
 * Route: `/volunteers`
 */

import { useState } from 'react';
import { Plus, HandHeart, CheckCircle2 } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { overflowApi } from '../api/overflow';
import { coursesApi } from '../api/courses';
import { useAuth } from '../hooks/useAuth';
import { formatHours, getInitials } from '../utils/helpers';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
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
  const { data: coursesData } = useApi(coursesApi.getCourses, { immediate: isOrganiser });
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const posts = data?.data ?? data ?? [];
  const courses = coursesData?.data ?? coursesData ?? [];

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

  return (
    <>
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

      {posts.length === 0 ? (
        <EmptyState
          icon={HandHeart}
          title="No overflow work right now"
          description="Check back soon, or post new work if you're an organiser."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id}>
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <HandHeart className="h-5 w-5" />
                </div>
                <Badge tone={STATUS_TONE[post.status] || 'neutral'}>{post.status}</Badge>
              </div>
              <h3 className="mt-4 font-bold text-slate-900">
                {post.course?.code || post.courseId}
              </h3>
              <p className="text-sm text-slate-500">{post.course?.name}</p>
              <p className="mt-2 text-xs text-slate-400">
                {post.description || 'No description provided.'}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <Badge tone="primary">{formatHours(post.hoursPerWeek)} / week</Badge>

                {!isOrganiser && post.status === 'OPEN' && (
                  <Button
                    size="sm"
                    onClick={() => handleClaim(post.id)}
                    loading={busyId === post.id}
                  >
                    Claim
                  </Button>
                )}

                {isOrganiser && post.claims?.length > 0 && (
                  <div className="w-full">
                    <p className="mt-1 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Claims
                    </p>
                    <div className="space-y-2">
                      {post.claims.map((claim) => (
                        <div
                          key={claim.id}
                          className="flex items-center justify-between rounded-lg border border-slate-100 px-2.5 py-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                              {getInitials(claim.user?.name)}
                            </div>
                            <span className="text-xs text-slate-600">{claim.user?.name}</span>
                          </div>
                          {claim.status === 'CLAIMED' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleApproveClaim(claim.id)}
                              loading={busyId === claim.id}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                            </Button>
                          ) : (
                            <Badge tone="success">Approved</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
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
