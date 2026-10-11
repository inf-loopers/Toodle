import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp, Mail, BookOpen } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { tutorPageTopics } from '../../content/tutorGuide';
import { studentPageTopics } from '../../content/studentGuide';
import { lecturerPageTopics } from '../../content/lecturerGuide';
import Modal from '../ui/Modal';

export default function HelpButton() {
  const [open, setOpen] = useState(false);
  const { isTutor, isStudent, isLecturer } = useAuth();
  const { pathname } = useLocation();
  const pageTopics = isLecturer
    ? lecturerPageTopics
    : isStudent
      ? studentPageTopics
      : tutorPageTopics;
  const topic = pageTopics[pathname] ?? (pathname.startsWith('/courses/') ? 'courses' : null);
  const linkClass =
    'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

  return (
    <>
      <button
        type="button"
        aria-label="Help"
        title="Help"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <CircleHelp className="h-5 w-5" aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div className="toodle-app text-slate-900 dark:text-slate-100">
            <Modal
              open={open}
              onClose={() => setOpen(false)}
              title="Help"
              description="Choose a guide or contact our support team."
              size="sm"
            >
              {(isTutor || isStudent || isLecturer) && (
                <>
                  <Link to="/help" className={linkClass} onClick={() => setOpen(false)}>
                    <BookOpen className="h-5 w-5 shrink-0" aria-hidden="true" /> Getting started
                  </Link>
                  {topic && (
                    <Link
                      to={`/help#${topic}`}
                      className={linkClass}
                      onClick={() => setOpen(false)}
                    >
                      <CircleHelp className="h-5 w-5 shrink-0" aria-hidden="true" /> Help with this
                      page
                    </Link>
                  )}
                </>
              )}
              <a
                href="mailto:toodle.issues@gmail.com"
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Mail className="h-5 w-5 shrink-0" aria-hidden="true" />
                Contact support
              </a>
            </Modal>
          </div>,
          document.body
        )}
    </>
  );
}
