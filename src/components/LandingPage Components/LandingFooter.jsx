import React from 'react';
import { Mail } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer className="shrink-0 border-t border-white/10 bg-[#0b3b70] text-white transition-colors duration-300 dark:border-slate-800 dark:bg-[#050b16]">
      <div className="mx-auto grid max-w-7xl gap-4 px-6 py-4 text-sm md:grid-cols-[1.6fr_auto] md:items-center md:px-10">
        <section>
          <p className="leading-5 text-blue-100">
            Developed by <span className="font-semibold text-white">Infinite Loopers</span> as part
            of the School of Computer Science and Applied Mathematics, University of the
            Witwatersrand.
          </p>

          <p className="mt-1 text-xs text-blue-200">&copy; 2026 Toodle. All rights reserved.</p>
        </section>

        <a
          href="mailto:support@example.com"
          className="flex items-center gap-2 text-blue-100 transition hover:text-[#f6b81a]"
        >
          <Mail size={14} />
          Contact Support
        </a>
      </div>
    </footer>
  );
}
