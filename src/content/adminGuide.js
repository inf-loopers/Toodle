import { lecturerGuide } from './lecturerGuide';
const shared = (id) => lecturerGuide.find((topic) => topic.id === id);

export const adminGuide = [
  {
    id: 'navigation',
    title: 'Find your way around Toodle',
    description: 'Your administrator account manages access and courses across the platform.',
    steps: [
      'Open the menu to find Users and Reports under Admin.',
      'Use Courses, Tutors and Allocation Board to review staffing across courses.',
      'Open Profile to check your account details. Use Help to return to this guide.',
    ],
  },
  {
    id: 'users',
    title: 'Invite staff and review access requests',
    description: 'Give each person the access they need before they enter their staff workspace.',
    steps: [
      'Open Users and choose Invite staff.',
      'Enter the person’s institutional email, choose Lecturer or Administrator, and select courses for lecturers where known.',
      'Send the invitation. Check the delivery message; if email could not be sent, share the displayed sign-in link with the invited person.',
      'For pending requests, check the person’s identity and department, choose Review staff request, select the approved role and courses, and enter a decision reason.',
      'Approve or decline the request. The person can check their access status during onboarding.',
      'For existing accounts, use Change role. You cannot change your own role or remove the last administrator.',
    ],
    note: 'Invitations expire after 7 days and require a matching verified sign-in email. Requesting a staff role does not grant staff permissions.',
  },
  {
    id: 'courses',
    title: 'Create courses and assign lecturers',
    description: 'Set up courses before lecturers begin reviewing applicants.',
    steps: [
      'Open Courses and create the course with its code, name and staffing requirements.',
      'Open the course and use its coordinator controls to assign lecturers.',
      'Check course sessions and requirements before applications are opened.',
      'If a lecturer has no courses in My Courses, check both their role and coordinator assignments.',
    ],
  },
  {
    id: 'reports',
    title: 'Review platform reports',
    description: 'Review staffing and payment information across the platform.',
    steps: [
      'Open Reports and choose the report and available filters.',
      'Review staffing gaps, course budgets and timesheet or payment information.',
      'Check the selected period and records before exporting a report.',
    ],
  },
  {
    id: 'dashboard',
    title: 'Understand your dashboard',
    description: 'Review staffing across the platform.',
    steps: [
      'Check the course, tutor, allocation and unfilled-course summary cards.',
      'Review Courses needing tutors and open the course that needs attention.',
      'Use Users for access decisions and Reports for platform oversight.',
    ],
  },
  shared('applications'),
  shared('allocations'),
  shared('tutors'),
  shared('timesheets'),
  shared('excusals'),
  shared('swaps'),
  shared('volunteers'),
  shared('calendar'),
  {
    id: 'profile',
    title: 'Review your administrator profile',
    description: 'Check the account used to administer Toodle.',
    steps: [
      'Open Profile and confirm your name, email and Administrator role.',
      'Use the profile-picture control to update your picture if needed.',
    ],
  },
  shared('search'),
  shared('notifications'),
];
export const adminPageTopics = {
  '/users': 'users',
  '/reports': 'reports',
  '/courses': 'courses',
  '/dashboard': 'dashboard',
  '/allocations': 'allocations',
  '/tutors': 'tutors',
  '/timesheets': 'timesheets',
  '/excusals': 'excusals',
  '/swaps': 'swaps',
  '/volunteers': 'volunteers',
  '/calendar': 'calendar',
  '/profile': 'profile',
};
