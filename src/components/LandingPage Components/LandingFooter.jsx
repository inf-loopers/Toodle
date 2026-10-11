import React from 'react';
import { Mail } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer className="shrink-0 border-t border-white/10 bg-[#0b3b70] text-white transition-colors duration-300 dark:border-slate-800 dark:bg-[#050b16]">
      <div className="mx-auto grid max-w-7xl justify-items-center gap-0 px-6 py-0.5 text-center text-xs">
        <section>
          <p className="leading-[15px] text-blue-100">
            Developed by <span className="font-semibold text-white">Infinite Loopers</span>
            <span className="md:hidden"> for CSAM</span>
            <span className="hidden md:inline">
              {' '}
              as part of the School of Computer Science and Applied Mathematics, University of the
              Witwatersrand.
            </span>
          </p>

          <p className="mt-0.5 text-[10px] leading-[14px] text-blue-200">
            &copy; 2026 Toodle. All rights reserved.
          </p>
        </section>

        <a
          href="mailto:toodle.issues@gmail.com"
          className="flex items-center gap-2 text-blue-100 transition hover:text-[#f6b81a]"
        >
          <Mail size={14} aria-hidden="true" />
          Contact Support
        </a>
      </div>
    </footer>
  );
}
