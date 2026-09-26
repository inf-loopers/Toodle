/**
 * @file OnboardingPage.jsx
 * @description First-time onboarding flow for students.
 *
 * Collects the information the system needs before a student can use the app:
 *   1. Year of study
 *   2. Free-time (availability) windows
 *   3. Course marks for the modules they passed (at least one; more optional)
 *
 * Each step saves to the backend and refreshes the shared profile so the
 * route gate (`OnboardingGate`) releases as soon as everything is complete.
 *
 * Route: `/onboarding`
 *
 * Endpoint Connections:
 * - PATCH /users/:id           (year of study)
 * - PUT   /tutors/:id/availability
 * - POST  /tutors/me/marks
 * - GET   /auth/me             (profile refresh)
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, GraduationCap, Moon, PartyPopper, Sun } from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { usersApi } from '../api/users';
import { tutorsApi } from '../api/tutors';
import { coursesApi } from '../api/courses';

import { getOnboardingMissing, ONBOARDING_MISSING_LABELS } from '../utils/onboarding';
import { formatStatus } from '../utils/helpers';
import { applyTheme, getInitialTheme, persistTheme } from '../utils/theme';

import { AvailabilityEditor } from '../components/availability/AvailabilityEditor';
import Card, { CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { Input, Select } from '../components/ui/Input';

const STEPS = [
  { key: 'yearOfStudy', label: 'Year of study' },
  { key: 'availability', label: 'Your free time' },
  { key: 'courseMark', label: 'Course mark' },
];

export function OnboardingPage() {
  const { isLoading, dbUser, updateDbUser } = useAuth();
  const navigate = useNavigate();
  const profile = dbUser;

  const missing = getOnboardingMissing(profile);
  const done = missing.length === 0;

  const [theme, setTheme] = useState(getInitialTheme);
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [mark, setMark] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const [markStepCompleted, setMarkStepCompleted] = useState(false);
  const [showMarkForm, setShowMarkForm] = useState(true);
  const [savedMarkMessage, setSavedMarkMessage] = useState('');

  useEffect(() => {
    if (profile?.yearOfStudy != null) setYearOfStudy(String(profile.yearOfStudy));
  }, [profile?.yearOfStudy]);

  useEffect(() => {
    coursesApi
      .getCourses()
      .then((response) => setCourses(response?.data ?? response ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  const refreshProfile = async () => {
    const me = await usersApi.getCurrentUser();
    const next = me?.data ?? me;
    if (next) updateDbUser(next);
  };

  const handleSaveYear = async () => {
    if (!profile?.id) return;
    const value = Number(yearOfStudy);
    if (!Number.isInteger(value) || value < 1 || value > 10) {
      setError('Enter a year of study between 1 and 10.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await usersApi.updateUser(profile.id, { yearOfStudy: value });
      await refreshProfile();
    } catch (saveError) {
      setError(saveError?.response?.data?.error || 'Could not save your year of study.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMark = async () => {
    if (!profile?.id) return;
    if (!courseId) {
      setError('Choose a course you have completed.');
      return;
    }
    const value = Number(mark);
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      setError('Enter a mark between 0 and 100.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await tutorsApi.submitMark({ courseId, mark: value });
      await refreshProfile();
      const savedCourse = courses.find((course) => course.id === courseId);
      setSavedMarkMessage(
        `Mark submitted for ${savedCourse?.code ?? 'the course'} — pending coordinator verification.`
      );
      setMarkStepCompleted(true);
      setShowMarkForm(false);
      setCourseId('');
      setMark('');
    } catch (saveError) {
      setError(saveError?.response?.data?.error || 'Could not submit your mark.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    setError('');
    try {
      await refreshProfile();
    } catch {
      // The profile was already refreshed after the last save; the route gate
      // uses the current state either way.
    } finally {
      setSaving(false);
    }
    setFinished(true);
  };

  if (isLoading || !profile) {
    return <Spinner fullPage label="Loading your onboarding…" />;
  }

  const currentStep = missing.length
    ? STEPS.findIndex((step) => step.key === missing[0])
    : STEPS.length;
  const selectedCourse = courses.find((course) => course.id === courseId);

  const submittedMarks = profile?.tutorMarks ?? [];
  const submittedCourseIds = submittedMarks.map((item) => item.courseId);
  const availableCourses = courses.filter((course) => !submittedCourseIds.includes(course.id));
  // Once the last missing item (the mark) is saved, hold the student on the
  // mark step so they can add marks for more courses before finishing.
  const markStepHeld = done && markStepCompleted && !finished;
  const showMarkStep = markStepHeld || (!done && currentStep === 2);

  return (
    <div className="toodle-app min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100">
      <div className="relative mx-auto max-w-2xl px-4 py-10">
        <button
          type="button"
          onClick={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="absolute right-4 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Heading */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Welcome to Toodle
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Before you enter the app we need a few details about your studies and free time so we
            can match you to the right courses.
          </p>
        </div>

        {/* What is still missing */}
        {!done && (
          <Card className="mb-6">
            <CardBody>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Still to complete
              </p>
              <div data-testid="onboarding-missing" className="mt-2 flex flex-wrap gap-2">
                {missing.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  >
                    {ONBOARDING_MISSING_LABELS[item] ?? item}
                  </span>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Step indicator */}
        <ol className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((step, index) => {
            const isDone = currentStep > index || done;
            const isCurrent = !done && currentStep === index;
            return (
              <li key={step.key} className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    isCurrent ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                )}
              </li>
            );
          })}
        </ol>

        {error && (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </p>
        )}

        {/* Step 1 — Year of study */}
        {!done && currentStep === 0 && (
          <Card>
            <CardHeader
              title="What year are you in?"
              description="Your year of study helps coordinators understand which modules you can realistically tutor."
            />
            <CardBody>
              <Select
                label="Year of study"
                value={yearOfStudy}
                onChange={(event) => setYearOfStudy(event.target.value)}
              >
                <option value="">Select your year…</option>
                {Array.from({ length: 10 }, (_, index) => index + 1).map((year) => (
                  <option key={year} value={year}>
                    Year {year}
                  </option>
                ))}
              </Select>
              <div className="mt-4">
                <Button onClick={handleSaveYear} loading={saving}>
                  Save and continue
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Step 2 — Free time */}
        {!done && currentStep === 1 && (
          <AvailabilityEditor
            title="When are you free to tutor?"
            description="Add the weekly windows you can attend tutorials, labs, or volunteer sessions in."
            saveLabel="Save free time"
            initialSlots={
              profile?.availability?.map((slot) => ({
                dayOfWeek: slot.dayOfWeek,
                startTime: slot.startTime,
                endTime: slot.endTime,
              })) ?? []
            }
            onSave={async (slots) => {
              if (profile?.id) {
                await tutorsApi.setAvailability(profile.id, slots);
                await refreshProfile();
              }
            }}
          />
        )}

        {/* Step 3 — Course marks */}
        {showMarkStep && (
          <Card>
            <CardHeader
              title={markStepHeld ? 'Course marks' : 'Submit a course mark'}
              description={
                markStepHeld
                  ? 'Add marks for other modules you passed, or finish onboarding. Each course needs its own verified mark before you can tutor it.'
                  : 'Tell us about a module you have already passed. A course coordinator will verify your mark against your transcript before you can tutor it.'
              }
            />
            <CardBody>
              {savedMarkMessage && (
                <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {savedMarkMessage}
                </p>
              )}

              {submittedMarks.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Marks on record
                  </p>
                  <ul className="mt-2 space-y-2">
                    {submittedMarks.map((item) => (
                      <li
                        key={item.id ?? item.courseId}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800"
                      >
                        <span className="min-w-0 truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                          {item.course?.code ?? 'Course'} — {item.mark}%
                        </span>
                        <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          {formatStatus(item.status)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {showMarkForm && (
                <>
                  <Select
                    label="Course"
                    value={courseId}
                    onChange={(event) => setCourseId(event.target.value)}
                  >
                    <option value="">Choose a course you completed…</option>
                    {availableCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} — {course.name}
                      </option>
                    ))}
                  </Select>

                  <div className="mt-4">
                    <Input
                      label="Final mark (%)"
                      type="number"
                      min={0}
                      max={100}
                      value={mark}
                      onChange={(event) => setMark(event.target.value)}
                      className="max-w-40"
                    />
                    {selectedCourse?.minMarkRequired != null && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {selectedCourse.code} requires at least {selectedCourse.minMarkRequired}% to
                        tutor it. Your mark starts as pending until a coordinator verifies it.
                      </p>
                    )}
                  </div>

                  <div className="mt-4">
                    <Button onClick={handleSaveMark} loading={saving}>
                      Submit mark
                    </Button>
                  </div>
                </>
              )}

              {markStepHeld && (
                <div className="mt-6 flex flex-wrap gap-3">
                  {!showMarkForm && (
                    <Button
                      variant="secondary"
                      onClick={() => setShowMarkForm(true)}
                      disabled={availableCourses.length === 0}
                    >
                      Add another mark
                    </Button>
                  )}
                  <Button onClick={handleFinish} loading={saving}>
                    Finish onboarding
                  </Button>
                </div>
              )}

              {markStepHeld && availableCourses.length === 0 && (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                  You&apos;ve submitted marks for every available course. Finish onboarding to enter
                  the app.
                </p>
              )}
            </CardBody>
          </Card>
        )}

        {/* Complete */}
        {done && (finished || !markStepCompleted) && (
          <Card>
            <CardBody className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <PartyPopper className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                You&apos;re all set
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                Your year of study, free time, and course marks are on record. You can now browse
                courses and apply to tutor.
              </p>
              <div className="mt-6">
                <Button onClick={() => navigate('/dashboard', { replace: true })}>
                  Go to dashboard
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

export default OnboardingPage;
