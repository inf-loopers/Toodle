/**
 * @file Footer.jsx
 * @description Standard application footer displaying university copyright, course metadata, and helpful links.
 *
 * Responsibilities:
 * - Renders university branding and SDP project attribution.
 * - Stays fixed or pinned at the bottom of the layout structure.
 * - Responsive layout adapting between mobile and desktop viewports.
 */

import { GraduationCap } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-5 lg:px-8">
      <div className="flex flex-col items-center justify-between gap-3 text-sm text-slate-400 sm:flex-row">
        <div className="flex items-center gap-2 font-medium text-slate-500">
          <GraduationCap className="h-4 w-4" />
          University of the Witwatersrand
        </div>
        <div className="flex items-center gap-5">
          <a href="#" className="hover:text-slate-700">
            Contact Support
          </a>
          <a href="#" className="hover:text-slate-700">
            Privacy Policy
          </a>
        </div>
        <p>© {new Date().getFullYear()} Wits University. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
