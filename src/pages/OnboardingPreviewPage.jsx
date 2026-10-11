import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import OnboardingPage from './OnboardingPage';
import StaffWelcomePage from './StaffWelcomePage';
import Button from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';

const courses = [
  {
    id: 'preview-course',
    code: 'COMS101',
    name: 'Example introductory course',
    minMarkRequired: 60,
  },
];
const newProfile = (user, role) => ({
  id: 'onboarding-preview',
  name: user?.name || 'Preview user',
  email: user?.email || 'preview@example.edu',
  role,
  yearOfStudy: null,
  availability: [],
  tutorMarks: [],
  coordinatedCourses: [],
});

export default function OnboardingPreviewPage() {
  const { dbUser, isLoading } = useAuth();
  const [profile, setProfile] = useState(() => newProfile(dbUser, 'STUDENT'));
  const [run, setRun] = useState(0);
  const [finishedDestination, setFinishedDestination] = useState('');

  // This tool is available only in the local development app, behind sign-in.
  // It never replaces the real authentication context or calls write APIs.
  if (!import.meta.env.DEV) return <Navigate to="/profile" replace />;
  if (isLoading || !dbUser) return <Spinner fullPage label="Loading onboarding preview…" />;

  function restart(role = profile.role) {
    setProfile(newProfile(dbUser, role));
    setFinishedDestination('');
    setRun((value) => value + 1);
  }
  const previewSession = {
    profile,
    courses,
    onProfileChange: setProfile,
    onFinish: setFinishedDestination,
  };

  return (
    <div>
      <section
        className="mx-auto max-w-2xl space-y-4 px-4 pt-8"
        aria-label="Onboarding preview controls"
      >
        <h1 className="text-2xl font-bold">Preview first-time onboarding</h1>
        <p className="text-sm">
          Try each role with sample course data. Changes stay in this preview; your saved profile,
          permissions, swaps and timesheets are preserved. Your signed-in role is {dbUser.role}.
        </p>
        <Select
          label="Preview role"
          value={profile.role}
          onChange={(event) => restart(event.target.value)}
        >
          <option value="STUDENT">Student</option>
          <option value="LECTURER">Lecturer</option>
          <option value="ADMIN">Administrator</option>
        </Select>
        {profile.role === 'LECTURER' && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={profile.coordinatedCourses.length > 0}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  coordinatedCourses: event.target.checked ? [{ course: courses[0] }] : [],
                }))
              }
            />
            Include a sample assigned course
          </label>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="secondary" onClick={() => restart()}>
            Restart preview
          </Button>
          <Link to="/profile" className="text-sm text-primary underline">
            Exit preview
          </Link>
        </div>
        {finishedDestination && (
          <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            Preview complete. A real {profile.role.toLowerCase()} account would now open{' '}
            {finishedDestination === '/help' ? 'guided help' : 'the dashboard'}. Use Restart preview
            to try again.
          </p>
        )}
      </section>
      {profile.role === 'STUDENT' ? (
        <OnboardingPage key={`student-${run}`} previewSession={previewSession} />
      ) : (
        <StaffWelcomePage key={`${profile.role}-${run}`} previewSession={previewSession} />
      )}
    </div>
  );
}
