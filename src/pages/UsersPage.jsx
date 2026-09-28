/**
 * @file UsersPage.jsx
 * @description Admin-only user administration: browse every account, search and
 * filter by role, and change a user's role.
 *
 * Safeguards (also enforced server-side): admins never see a change-role action
 * on their own row, and the API refuses to demote the last remaining ADMIN.
 */

import { useMemo, useState } from 'react';
import { usersApi } from '../api/users';
import { useAuth } from '../hooks/useAuth';
import useApi from '../hooks/useApi';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Input, { Select } from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { ROLE_LABELS, ROLES } from '../utils/constants';

// DB roles are uppercase enum values; ROLES/ROLE_LABELS use lowercase keys.
const roleKey = (role) => String(role ?? '').toLowerCase();

const ROLE_OPTIONS = [ROLES.ADMIN, ROLES.LECTURER, ROLES.TUTOR, ROLES.STUDENT];

const ROLE_TONES = {
  [ROLES.ADMIN]: 'primary',
  [ROLES.LECTURER]: 'info',
  [ROLES.TUTOR]: 'success',
  [ROLES.STUDENT]: 'neutral',
};

const roleLabel = (role) => ROLE_LABELS[roleKey(role)] ?? role ?? 'Unknown';

/** Hints about what a given transition means, shown before confirming. */
function transitionHints(user, nextRole) {
  const current = roleKey(user.role);
  const hints = [];
  if (current === ROLES.TUTOR && nextRole !== ROLES.TUTOR) {
    hints.push(
      'Their allocations, marks and timesheets stay on record, but they will no longer appear in tutor pools.'
    );
  }
  if (nextRole === ROLES.TUTOR && current !== ROLES.TUTOR) {
    hints.push('Promoting directly to tutor bypasses the standard application-and-approval flow.');
  }
  if (nextRole === ROLES.ADMIN && current !== ROLES.ADMIN) {
    hints.push('Admins can manage users, courses and allocations across the whole platform.');
  }
  return hints;
}

function ChangeRoleModal({ user, onClose, onChanged }) {
  const [role, setRole] = useState(roleKey(user.role));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const unchanged = role === roleKey(user.role);
  const hints = transitionHints(user, role);

  const save = async () => {
    setSubmitting(true);
    setError('');
    try {
      await usersApi.updateUser(user.id, { role: role.toUpperCase() });
      await onChanged();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not change the role.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Change role"
      description={`${user.name || user.email} is currently ${roleLabel(user.role)}.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={submitting} disabled={unchanged}>
            Save role
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Select label="New role" value={role} onChange={(event) => setRole(event.target.value)}>
          {ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {ROLE_LABELS[option]}
            </option>
          ))}
        </Select>
        {hints.map((hint) => (
          <p key={hint} className="text-xs text-amber-600 dark:text-amber-300">
            {hint}
          </p>
        ))}
        {error && (
          <p role="alert" className="text-xs text-rose-600">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

export function UsersPage() {
  const { dbUser } = useAuth();
  const { data: usersData, loading, error, refetch } = useApi(usersApi.getUsers);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editing, setEditing] = useState(null);

  const users = useMemo(() => usersData?.data ?? usersData ?? [], [usersData]);

  const counts = useMemo(() => {
    const tally = { all: users.length };
    for (const user of users) {
      const key = roleKey(user.role);
      tally[key] = (tally[key] ?? 0) + 1;
    }
    return tally;
  }, [users]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== 'all' && roleKey(user.role) !== roleFilter) return false;
      if (!needle) return true;
      return (
        (user.name ?? '').toLowerCase().includes(needle) ||
        (user.email ?? '').toLowerCase().includes(needle)
      );
    });
  }, [users, query, roleFilter]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading users…" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Couldn't load users"
        description={error}
        action={<Button onClick={refetch}>Try again</Button>}
      />
    );
  }

  const filters = ['all', ...ROLE_OPTIONS];

  return (
    <div data-testid="users-page">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Users</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Every account on the platform. Change a role to promote or demote someone.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            aria-label="Search users"
            placeholder="Search by name or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setRoleFilter(filter)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              roleFilter === filter
                ? 'border-primary bg-primary text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {filter === 'all' ? 'All' : ROLE_LABELS[filter]} ({counts[filter] ?? 0})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No users match"
          description="Try a different search term or role filter."
        />
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((user) => {
              const isSelf = user.id === dbUser?.id;
              return (
                <li key={user.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {user.name || 'Unnamed user'}
                      {isSelf && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-slate-400">{user.email}</p>
                  </div>
                  <Badge tone={ROLE_TONES[roleKey(user.role)] ?? 'neutral'}>
                    {roleLabel(user.role)}
                  </Badge>
                  {isSelf ? (
                    <span
                      className="text-xs text-slate-400"
                      title="You cannot change your own role"
                    >
                      —
                    </span>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setEditing(user)}>
                      Change role
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {editing && (
        <ChangeRoleModal user={editing} onClose={() => setEditing(null)} onChanged={refetch} />
      )}
    </div>
  );
}

export default UsersPage;
