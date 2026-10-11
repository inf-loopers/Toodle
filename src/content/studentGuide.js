import { tutorGuide } from './tutorGuide';

const sharedTopic = (id) => tutorGuide.find((topic) => topic.id === id);

export const studentGuide = [
  {
    id: 'navigation',
    title: 'Find your way around Toodle',
    description: 'Use the menu to find your pages.',
    steps: [
      'On mobile, press the menu icon in the top-left corner to open navigation.',
      'Choose "Dashboard", "Calendar", "Courses" or "Volunteer". Scroll the menu to find "Profile" under "Account", then press "X" to close the menu.',
      'Press your avatar in the header and choose "My Profile" to update your details.',
      'Press the question-mark "Help" icon whenever you need this guide.',
    ],
  },
  {
    id: 'dashboard',
    title: 'Understand your dashboard',
    description: 'Your dashboard highlights overflow work you can claim.',
    steps: [
      'Check "Open Opportunities" for the number of open posts and "Weekly Cap" for your maximum hours.',
      'Read the "Overflow work" list for a preview of available opportunities.',
      'Choose "Browse all" to view "Volunteer" and check eligibility before claiming work.',
    ],
    note: 'No open work right now? Check back later. A course coordinator reviews each claim.',
  },
  {
    id: 'profile',
    title: 'Set your profile, availability and weekly hours',
    description: 'Keep your study year, available times and weekly hours up to date.',
    steps: [
      'Press your avatar in the header and choose "My Profile".',
      'Choose your "Year of study" and press its "Save" button.',
      'Under "Weekly hours cap", enter "Hours per week" and press "Save".',
      'Under "Availability", press "Add slot" and choose the "Day", "From" time and "To" time.',
      'Add all your available times, then press "Save availability". If you use "Import timetable", review the imported times before saving.',
    ],
    note: 'Your year of study, weekly hours and availability have separate "Save" buttons. Save each section you change.',
  },
  {
    id: 'courses',
    title: 'Browse courses and submit your marks',
    description: 'Course marks are submitted on the relevant course page.',
    steps: [
      'Open "Courses" from the menu. Search using a course code or name, then open the course.',
      'Read the course requirements and find "Tutor applications".',
      'Enter "Your course mark (%)" and press "Submit mark for verification".',
      'Check your recorded mark and its status. A course coordinator verifies it against school records.',
    ],
    note: 'Verified marks cannot be edited here. Contact your course coordinator with supporting records if a verified mark needs correcting.',
  },
  {
    id: 'applications',
    title: 'Check eligibility and apply to tutor',
    description: 'Apply from the course page after completing the required checks.',
    steps: [
      'Set your availability and weekly hours in "My Profile", then submit your mark on the course page.',
      'Read the eligibility checks under "Tutor applications" and resolve any messages shown.',
      'When applications are open and you are eligible, enter "Requested hours per week" and "Why would you like to tutor this course?"',
      'Press "Apply to tutor". Return to the course page and use "Refresh applications" to check your status and any coordinator reason.',
      'If approved, reload the app to refresh your tutor role and open your dashboard. You can withdraw a pending application using "Withdraw application".',
    ],
    note: 'Submitting a mark or application does not guarantee approval. Reapplication after rejection or withdrawal is not currently supported; contact your course coordinator.',
  },
  {
    ...sharedTopic('volunteers'),
    steps: [
      ...sharedTopic('volunteers').steps.slice(0, 3),
      'Once your claim is approved, reload the app to refresh your role to tutor. "Timesheets" will then appear in your menu so you can record the approved work.',
    ],
  },
  sharedTopic('calendar'),
  sharedTopic('search'),
  sharedTopic('notifications'),
];

export const studentPageTopics = {
  '/dashboard': 'dashboard',
  '/profile': 'profile',
  '/courses': 'courses',
  '/volunteers': 'volunteers',
  '/calendar': 'calendar',
};
