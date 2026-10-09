import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  MessageCircleMore,
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import heroIllustrationWebp from '../../assets/toodle_hero_part1.webp';
import heroIllustration from '../../assets/toodle_hero_part1.png';

export default function Hero() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login', { state: { from: '/dashboard' } });
    }
  };

  return (
    <section className="relative flex min-h-0 flex-1 items-center overflow-hidden bg-white transition-colors duration-300 dark:bg-[#07111f]">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-6 py-4 md:px-10 lg:grid-cols-[0.82fr_1.18fr]">
        {/* LEFT SIDE */}
        <Motion.section
          initial={{ opacity: 0, x: -25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <h1
            className="text-[120px] font-extrabold leading-none tracking-tight text-[#0b3b70] transition-colors dark:text-slate-50 md:text-[72px]"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            Toodle
          </h1>

          <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-500 transition-colors dark:text-slate-200 md:text-2xl">
            Tutor Management Made Simple
            <span className="text-[#f6b81a]">.</span>
          </h2>

          <p className="mt-5 max-w-xl text-sm leading-6 text-slate-500 transition-colors dark:text-slate-300 md:text-base">
            Toodle helps you manage tutors, sessions, allocations, timesheets and academic support
            all in one connected space.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleClick}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0b3b70] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#092f59] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#f6b81a] dark:text-[#07111f] dark:hover:bg-[#ffd35a]"
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
              <ArrowRight size={16} />
            </button>
          </div>
        </Motion.section>

        {/* RIGHT SIDE */}
        <section className="relative hidden h-[540px] lg:block">
          {/* CONNECTOR PATHS */}
          <svg
            className="pointer-events-none absolute inset-0 z-[5] h-full w-full"
            viewBox="0 0 700 540"
            fill="none"
          >
            <DottedPath
              d="
                M 165 102
                C 185 118, 198 140, 202 162
                C 206 184, 205 205, 195 228
                C 186 246, 180 256, 182 270
              "
              color="#f6b81a"
            />

            <DottedPath
              d="
                M 360 90
                C 378 108, 390 130, 392 154
                C 394 178, 388 200, 380 220
                C 374 236, 370 248, 372 262
              "
              color="#f6b81a"
            />

            <DottedPath
              d="
                M 585 100
                C 606 118, 620 140, 625 164
                C 630 188, 625 210, 615 230
                C 606 246, 598 258, 600 272
              "
              color="#f6b81a"
            />

            <DottedPath
              d="
                M 95 205
                C 106 220, 118 234, 130 248
                C 140 260, 147 270, 150 282
              "
              color="#a5b4c9"
            />

            <DottedPath
              d="
                M 555 198
                C 552 214, 546 228, 538 242
                C 530 254, 523 264, 520 278
              "
              color="#a5b4c9"
            />
          </svg>

          {/* HERO ILLUSTRATION */}
          <Motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="absolute bottom-[-108px] left-1/2 z-10 w-[585px] -translate-x-1/2"
          >
            <picture>
              <source srcSet={heroIllustrationWebp} type="image/webp" />
              <img
                src={heroIllustration}
                alt="Tutor and students learning around an open book"
                className="w-full object-contain"
                width={1254}
                height={1254}
                fetchPriority="high"
                decoding="async"
              />
            </picture>
          </Motion.div>

          {/* TOP LEFT CARD */}
          <FloatingCard className="left-[8px] top-[24px]" delay={0} duration={4.8} baseRotate={-3}>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff5d6] dark:bg-[#2a2540]">
                <CalendarDays size={17} className="text-[#0b3b70] dark:text-[#f6b81a]" />
              </span>

              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Next session
                </p>

                <p className="text-sm font-semibold text-[#0b3b70] dark:text-slate-100">
                  Algorithms
                </p>

                <p className="text-xs text-slate-400 dark:text-slate-400">Tue, 14:00</p>
              </div>
            </div>
          </FloatingCard>

          {/* TOP MIDDLE CARD */}
          <FloatingCard
            className="left-1/2 top-[10px] min-w-[220px] -translate-x-1/2"
            delay={0.3}
            duration={4.6}
            baseRotate={1.5}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef4fb] dark:bg-[#15243a]">
                <CheckCircle2 size={17} className="text-[#0b3b70] dark:text-sky-300" />
              </span>

              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">Progress</p>

                <p className="text-sm font-semibold text-[#0b3b70] dark:text-slate-100">
                  4 sessions completed
                </p>

                <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full w-3/4 rounded-full bg-[#f6b81a]" />
                </div>
              </div>
            </div>
          </FloatingCard>

          {/* TOP RIGHT CARD */}
          <FloatingCard
            className="right-[8px] top-[24px]"
            delay={0.7}
            duration={4.9}
            baseRotate={3}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff5d6] dark:bg-[#2a2540]">
                <Clock3 size={17} className="text-[#0b3b70] dark:text-[#f6b81a]" />
              </span>

              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">Tutor available</p>

                <p className="text-sm font-semibold text-[#0b3b70] dark:text-slate-100">
                  Ready to help
                </p>
              </div>
            </div>
          </FloatingCard>

          {/* FLOATING MESSAGE ICON */}
          <FloatingIcon
            className="left-[70px] top-[172px]"
            delay={0}
            duration={3.8}
            background="bg-[#eef4fb] dark:bg-[#15243a]"
          >
            <MessageCircleMore size={19} className="text-[#0b3b70] dark:text-sky-300" />
          </FloatingIcon>

          {/* FLOATING DOCUMENT ICON */}
          <FloatingIcon
            className="right-[140px] top-[168px]"
            delay={0.3}
            duration={3.9}
            background="bg-[#eef4fb] dark:bg-[#15243a]"
          >
            <FileText size={19} className="text-[#0b3b70] dark:text-sky-300" />
          </FloatingIcon>
        </section>
      </div>
    </section>
  );
}

function DottedPath({ d, color }) {
  return (
    <path
      d={d}
      stroke={color}
      strokeWidth="3.5"
      strokeDasharray="1 12"
      strokeLinecap="round"
      fill="none"
      opacity="0.95"
    />
  );
}

function FloatingCard({ children, className = '', delay = 0, duration = 4, baseRotate = 0 }) {
  return (
    <Motion.aside
      className={`absolute z-30 min-w-[180px] rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-lg shadow-slate-200/60 transition-colors dark:border-slate-700/70 dark:bg-[#111f33] dark:shadow-black/30 ${className}`}
      animate={{
        y: [0, -7, 0],
        rotate: [baseRotate, baseRotate + 1, baseRotate],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </Motion.aside>
  );
}

function FloatingIcon({
  children,
  className = '',
  delay = 0,
  duration = 3.5,
  background = 'bg-white',
}) {
  return (
    <Motion.span
      className={`absolute z-30 flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm transition-colors dark:shadow-black/30 ${background} ${className}`}
      animate={{
        y: [0, -8, 0],
        rotate: [0, 3, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </Motion.span>
  );
}
