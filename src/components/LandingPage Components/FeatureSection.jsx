import React from 'react';
import { LayoutGrid, PenLine, HandHeart } from 'lucide-react';
import FeatureCard from './FeatureCard';

const FEATURES = [
  {
    icon: LayoutGrid,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'Organisers',
    description:
      'Optimise allocations with real-time validation and AI assistance. Manage large cohorts with confidence using our high-density scheduling board.',
  },
  {
    icon: PenLine,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    title: 'Tutors',
    description:
      'Manage your schedule, log hours, and track payments seamlessly. Keep your timesheets organised and verified in one central location.',
  },
  {
    icon: HandHeart,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    title: 'Volunteers',
    description:
      'Find and claim overflow work to support your academic community. Contribute to peer success while building your academic portfolio.',
  },
];

export default function FeatureSection() {
  return (
    <section className="relative bg-white">
      <div className="max-w-6xl mx-auto px-6 -mt-24 pb-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
