/**
 * @file constants.js
 * @description Central dictionary of system-wide constants, enum values, and Auth0 namespace keys.
 *
 * Enums & Constants:
 * - `ROLES`: User roles in the system (`ORGANISER`, `TUTOR`, `STUDENT`).
 * - `AUTH0_NAMESPACE`: Custom claim URI namespace for JWT token role extraction
 *                     (`{VITE_AUTH0_AUDIENCE}/roles`, default `https://toodle-api/roles`).
 * - `CONSTRAINT_TYPES`: Allocation constraint identifiers (`MARK_BELOW_THRESHOLD`, `TIMETABLE_CLASH`, `HOURS_EXCEEDED`).
 * - `ALLOCATION_STATUS`: Course assignment status (`ACTIVE`, `PENDING`, `REMOVED`).
 * - `SESSION_TYPES`: Course contact session types (`LECTURE`, `TUTORIAL`, `LAB`).
 * - `DAYS_OF_WEEK`: Weekday identifiers array.
 * - `ROLE_LABELS`: Human-readable display titles for roles.
 */

export const ROLES = {
  ORGANISER: 'organiser',
  TUTOR: 'tutor',
  STUDENT: 'student',
};

export const AUTH0_NAMESPACE = `${import.meta.env.VITE_AUTH0_AUDIENCE || 'https://toodle-api'}/roles`;

export const CONSTRAINT_TYPES = {
  MARK_BELOW_THRESHOLD: 'MARK_BELOW_THRESHOLD',
  TIMETABLE_CLASH: 'TIMETABLE_CLASH',
  HOURS_EXCEEDED: 'HOURS_EXCEEDED',
};

export const ALLOCATION_STATUS = {
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  REMOVED: 'REMOVED',
};

export const SESSION_TYPES = {
  LECTURE: 'LECTURE',
  TUTORIAL: 'TUTORIAL',
  LAB: 'LAB',
};

export const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export const ROLE_LABELS = {
  [ROLES.ORGANISER]: 'Course Organiser',
  [ROLES.TUTOR]: 'Tutor',
  [ROLES.STUDENT]: 'Student',
};

// ── Timesheets ────────────────────────────────────────────────────────────

export const TIMESHEET_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  DISPUTED: 'DISPUTED',
  REJECTED: 'REJECTED',
  PAID: 'PAID',
};

export const TIMESHEET_STATUS_TONE = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  APPROVED: 'success',
  DISPUTED: 'warning',
  REJECTED: 'danger',
  PAID: 'primary',
};

// ── Overflow / Excusals / Swaps ─────────────────────────────────────────────

export const OVERFLOW_STATUS = {
  OPEN: 'OPEN',
  CLAIMED: 'CLAIMED',
  APPROVED: 'APPROVED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
};

export const EXCUSAL_STATUS_TONE = {
  PENDING: 'warning',
  APPROVED: 'success',
  DECLINED: 'danger',
};

export const SWAP_STATUS_TONE = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

// ── Navigation ───────────────────────────────────────────────────────────

// icon values reference lucide-react component names, resolved in Sidebar.jsx
export const NAV_SECTIONS = {
  [ROLES.ORGANISER]: [
    {
      heading: 'Overview',
      items: [{ name: 'Dashboard', path: '/dashboard', icon: 'Home' }],
    },
    {
      heading: 'Manage',
      items: [
        { name: 'Allocation Board', path: '/allocations', icon: 'LayoutGrid' },
        { name: 'Tutors', path: '/tutors', icon: 'Users' },
        { name: 'Courses', path: '/courses', icon: 'BookOpen' },
      ],
    },
    {
      heading: 'Workflow',
      items: [
        { name: 'Timesheets', path: '/timesheets', icon: 'Clock' },
        { name: 'Swaps', path: '/swaps', icon: 'ArrowLeftRight' },
        { name: 'Volunteers', path: '/volunteers', icon: 'HandHeart' },
      ],
    },
    {
      heading: 'Admin',
      items: [{ name: 'Reports', path: '/reports', icon: 'BarChart3' }],
    },
  ],
  [ROLES.TUTOR]: [
    {
      heading: 'Overview',
      items: [{ name: 'Dashboard', path: '/dashboard', icon: 'Home' }],
    },
    {
      heading: 'My Work',
      items: [
        { name: 'My Courses', path: '/courses', icon: 'BookOpen' },
        { name: 'Timesheets', path: '/timesheets', icon: 'Clock' },
        { name: 'Swaps', path: '/swaps', icon: 'ArrowLeftRight' },
        { name: 'Volunteer', path: '/volunteers', icon: 'HandHeart' },
      ],
    },
  ],
  [ROLES.STUDENT]: [
    {
      heading: 'Overview',
      items: [{ name: 'Dashboard', path: '/dashboard', icon: 'Home' }],
    },
    {
      heading: 'Opportunities',
      items: [{ name: 'Volunteer', path: '/volunteers', icon: 'HandHeart' }],
    },
  ],
};
