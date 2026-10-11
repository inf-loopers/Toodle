import { tutorGuide } from './tutorGuide';

const sharedTopic = (id) => tutorGuide.find((topic) => topic.id === id);

export const lecturerGuide = [
  {
    id: 'navigation',
    title: 'Find your way around Toodle',
    description: 'Use the menu to find your management and review pages.',
    steps: [
      'On mobile, press the menu icon in the top-left corner to open navigation.',
      'Under "Manage", choose "Allocation Board", "Tutors", "Courses" or "My Courses".',
      'Scroll to "Workflow" for "Timesheets", "Excusals", "Swaps" and "Volunteers". Find "Profile" under "Account".',
      'Press "X" to close the menu. Use the question-mark "Help" icon whenever you need this guide.',
    ],
  },
  {
    id: 'dashboard',
    title: 'Understand your dashboard',
    description: 'Review staffing and use the dashboard to reach your work pages.',
    steps: [
      'Check the course, tutor, allocation and unfilled-course summary cards.',
      'Review "Courses needing tutors" to find staffing gaps.',
      'Use the menu to open the relevant course or workflow page for your next task.',
    ],
    note: 'Management actions depend on which courses you coordinate. Being a lecturer does not grant access to every course’s approval controls.',
  },
  {
    id: 'courses',
    title: 'Review your courses and manage sessions',
    description: 'Prepare the courses you coordinate before assigning work.',
    steps: [
      'Open "My Courses" for courses you coordinate, or "Courses" to browse and search by code or name.',
      'Open a course and review its requirements, coordinators, sessions and assigned tutors.',
      'Under "Sessions", press "Add" when available. Choose "Day", "Start time", "End time", "Venue" and "Session type", then press "Add session".',
      'Use a session’s edit control to update its details and press "Save changes".',
    ],
    note: 'If management controls are missing, check that you are assigned as a coordinator for that course.',
  },
  {
    id: 'applications',
    title: 'Verify marks and review applications',
    description: 'Check school records and eligibility before approving an applicant.',
    steps: [
      'Open a course you coordinate and find "Tutor applications".',
      'Add course sessions and use "Open applications" when you are ready to accept applicants.',
      'Review each applicant’s submitted mark against school records, along with availability, requested hours and eligibility warnings.',
      'Use the available mark-verification controls to record the verified mark before approval.',
      'Enter a review reason where needed and choose "Approve application" or "Reject application". Use "Refresh applications" to reload the list.',
    ],
    note: 'Approval creates an active allocation. Resolve the displayed eligibility warnings and make sure applications are open and sessions exist before approving.',
  },
  {
    id: 'allocations',
    title: 'Assign tutors to courses',
    description: 'Use the allocation board to check staffing and assign eligible tutors.',
    steps: [
      'Open "Allocation Board" and review the courses, available tutors and unfilled places.',
      'Search for a tutor, then use "Assign to course", or press "+ Assign tutor" on a course.',
      'Review the selected tutor, course, hours and eligibility checks in the assignment window.',
      'Use "Confirm assignment" when the checks allow it. If "Save pending allocation" is offered, understand that it saves a pending assignment rather than active work.',
      'Review the updated course card and assigned tutor after saving.',
    ],
    note: 'On mobile, use the assignment buttons. Review all constraint messages before saving.',
  },
  {
    id: 'tutors',
    title: 'Review tutors, marks and pay rates',
    description: 'Inspect tutor information and manage the controls available for your courses.',
    steps: [
      'Open "Tutors" and search for the person you need.',
      'Open their details to review marks, availability and weekly hours.',
      'Where allowed, choose a course under "Add / update a mark", enter "Mark (%)" and press "Save mark" after checking school records.',
      'Under "Pay rate", review the existing rate. Where rate controls are available, enter "New rate from" and "Rate (R / hr)", then press "Save new rate".',
    ],
    note: 'Lecturers can manage pay rates only for tutors with active allocations on courses they coordinate. A missing pay rate can prevent timesheet approval.',
  },
  {
    id: 'timesheets',
    title: 'Review submitted timesheets',
    description: 'Check recorded work before approving it for payment.',
    steps: [
      'Open "Timesheets" and review the submitted work for your courses.',
      'Check the tutor, course, week, entries, logged hours and allocation information.',
      'Choose "Approve" when the work is correct and the approval checks allow it.',
      'If corrections are needed, use "Dispute" and explain them in "What needs to change?" before confirming.',
    ],
    note: 'Resolve pay rate or allocation problems before approval. Approval and payment are separate statuses.',
  },
  {
    id: 'excusals',
    title: 'Review excusal requests',
    description: 'Review requests to miss a specific scheduled session.',
    steps: [
      'Open "Excusals" and review pending requests for your courses.',
      'Check the tutor, course, session date and reason.',
      'Choose "Approve" or "Decline". If declining, enter a reason where appropriate and press "Decline request".',
      'Review the updated request status after your decision.',
    ],
  },
  {
    id: 'swaps',
    title: 'Review session swaps',
    description: 'Check both dated sessions before making a swap decision.',
    steps: [
      'Open "Swaps" and review the sessions, tutors, dates and any warnings.',
      'Wait for the receiving tutor to accept before approving a pending swap.',
      'Use the available approval or rejection controls for requests you are authorised to review. Give a reason when requested.',
      'Check the updated status and use the history controls to review previous decisions.',
    ],
    note: 'A swap exchanges dated sessions rather than course assignments. Times are shown in Africa/Johannesburg.',
  },
  {
    id: 'volunteers',
    title: 'Post overflow work and review claims',
    description: 'Make unfilled work available and review volunteer claims.',
    steps: [
      'Open "Volunteers" and use "Filter by course" to find relevant work.',
      'Use "Post overflow work" when available. Choose "Course", enter "Hours per week" and "Description", then submit the post.',
      'Review pending claims, the claimant’s details and the work requirements.',
      'Use the available approval or rejection controls after reviewing the eligibility checks.',
    ],
    note: 'Approving a Student’s claim changes their role to Tutor and creates an allocation or session-cover responsibility. They must refresh the app to load their updated role.',
  },
  sharedTopic('calendar'),
  {
    id: 'profile',
    title: 'Review your profile',
    description: 'Check the account details shown for your Lecturer profile.',
    steps: [
      'Choose "Profile" under "Account", or press your avatar and choose "My Profile".',
      'Review your name, email and role. Use the profile-picture control if you want to update your picture.',
      'Contact support if your account details or role are incorrect.',
    ],
  },
  sharedTopic('search'),
  sharedTopic('notifications'),
];

export const lecturerPageTopics = {
  '/dashboard': 'dashboard',
  '/courses': 'courses',
  '/my-courses': 'courses',
  '/allocations': 'allocations',
  '/tutors': 'tutors',
  '/timesheets': 'timesheets',
  '/excusals': 'excusals',
  '/swaps': 'swaps',
  '/volunteers': 'volunteers',
  '/calendar': 'calendar',
  '/profile': 'profile',
};
