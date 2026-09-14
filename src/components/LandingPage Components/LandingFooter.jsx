import React from 'react';
import { LifeBuoy, Lock } from 'lucide-react';
import LandingButton from './LandingButton';

export default function LandingFooter() {
  return (
    <footer className="bg-slate-50 border-t border-slate-100">
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <LandingButton variant="ghost" className="!p-0">
            <LifeBuoy size={15} strokeWidth={2} />
            Contact Support
          </LandingButton>
          <LandingButton variant="ghost" className="!p-0">
            <Lock size={15} strokeWidth={2} />
            Privacy Policy
          </LandingButton>
        </div>

        <span className="font-mono text-xs text-slate-400">
          © 2026 Infinite Loopers. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
