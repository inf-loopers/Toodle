import React from 'react';
import { LayoutDashboard, Clock3, HandHeart } from 'lucide-react';
import FeatureCard from './FeatureCard';

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Lecturers & Admins',
    description:
      'Manage tutor allocations, monitor academic support, and coordinate large course teams from one organised workspace.',
  },
  {
    icon: Clock3,
    title: 'Tutors',
    description:
      'Keep track of sessions, timesheets, allocations and academic responsibilities in one convenient place.',
  },
  {
    icon: HandHeart,
    title: 'Volunteers',
    description:
      'Discover overflow opportunities, support students and contribute where extra academic assistance is needed.',
  },
];

export default function FeatureSection() {
  return (
    <section id="features" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f6b81a]">
            Built for every role
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0b3b70] md:text-4xl">
            One space for the whole tutoring community.
          </h2>

          <p className="mt-4 text-base leading-relaxed text-slate-500">
            Whether you coordinate tutors, teach students or volunteer your time, Toodle keeps
            everything connected.
          </p>
        </header>

        <section className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </section>
      </div>
    </section>
  );
}
