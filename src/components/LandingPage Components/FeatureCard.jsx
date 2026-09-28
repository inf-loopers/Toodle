import React from 'react';

export default function FeatureCard({ icon: Icon, title, description }) {
  return (
    <article className="group rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff5d6] transition duration-300 group-hover:bg-[#f6b81a]">
        <Icon size={22} className="text-[#0b3b70]" strokeWidth={2} />
      </span>

      <h3 className="mt-6 text-xl font-bold text-[#0b3b70]">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>

      <span className="mt-7 block h-1 w-10 rounded-full bg-[#f6b81a] transition-all duration-300 group-hover:w-16" />
    </article>
  );
}
