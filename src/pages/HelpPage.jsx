import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, Mail } from 'lucide-react';
import Card from '../components/ui/Card';
import FeatureHeading from '../components/layout/FeatureHeading';
import { tutorGuide } from '../content/tutorGuide';
import navigationImage from '../assets/help/tutor/navigation.png';
import studentNavigationImage from '../assets/help/student/navigation.png';
import lecturerNavigationImage from '../assets/help/lecturer/navigation.png';
import { studentGuide } from '../content/studentGuide';
import { lecturerGuide } from '../content/lecturerGuide';
import { useAuth } from '../hooks/useAuth';

export default function HelpPage() {
  const { isStudent, isLecturer } = useAuth();
  const guide = isLecturer ? lecturerGuide : isStudent ? studentGuide : tutorGuide;
  const roleLabel = isLecturer ? 'Lecturer' : isStudent ? 'Student' : 'Tutor';
  const guideNavigationImage = isLecturer
    ? lecturerNavigationImage
    : isStudent
      ? studentNavigationImage
      : navigationImage;
  const { hash } = useLocation();
  const [openTopic, setOpenTopic] = useState(
    () => guide.find((item) => `#${item.id}` === hash)?.id ?? null
  );
  useEffect(() => {
    const topic = guide.find((item) => `#${item.id}` === hash);
    setOpenTopic(topic?.id ?? null);
    if (!topic) return;
    const heading = document.getElementById(`${topic.id}-title`);
    heading?.scrollIntoView?.({ block: 'start' });
    heading?.focus({ preventScroll: true });
  }, [hash, guide]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <FeatureHeading className="text-3xl font-bold tracking-tight text-slate-900">
          Getting started as a {roleLabel}
        </FeatureHeading>
        <p className="mt-2 text-sm text-slate-500">
          Start with these steps, or choose the topic you need help with.
        </p>
      </div>

      <div className="space-y-3">
        {guide.map((topic) => (
          <section key={topic.id} id={topic.id} aria-labelledby={`${topic.id}-title`}>
            <Card>
              <h2>
                <button
                  id={`${topic.id}-title`}
                  type="button"
                  aria-expanded={openTopic === topic.id}
                  aria-controls={`${topic.id}-content`}
                  onClick={() =>
                    setOpenTopic((current) => (current === topic.id ? null : topic.id))
                  }
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left text-base font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {topic.title}
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-5 w-5 shrink-0 transition-transform ${openTopic === topic.id ? 'rotate-180' : ''}`}
                  />
                </button>
              </h2>
              <div id={`${topic.id}-content`} hidden={openTopic !== topic.id}>
                {openTopic === topic.id && (
                  <>
                    <p className="mt-2 text-sm text-slate-500">{topic.description}</p>
                    <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed">
                      {topic.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    {topic.note && (
                      <p className="mt-4 rounded-lg bg-primary-subtle p-3 text-sm text-primary">
                        {topic.note}
                      </p>
                    )}
                    {topic.id === 'navigation' && (
                      <img
                        src={guideNavigationImage}
                        alt={`Mobile navigation menu showing ${roleLabel} pages.`}
                        width={360}
                        height={800}
                        loading="lazy"
                        className="mx-auto mt-5 h-auto w-full max-w-[280px] rounded-xl border border-slate-200 bg-white"
                      />
                    )}
                  </>
                )}
              </div>
            </Card>
          </section>
        ))}
      </div>

      <Card className="mt-6">
        <h2 className="text-lg font-semibold">Still need help?</h2>
        <a
          href="mailto:toodle.issues@gmail.com"
          className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Mail className="h-4 w-4" aria-hidden="true" /> Contact support
        </a>
      </Card>
    </div>
  );
}
