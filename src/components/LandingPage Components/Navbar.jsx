import React from "react";
import { GraduationCap } from "lucide-react";

export default function Navbar() {
  return (
    <header className="w-full bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <GraduationCap size={22} className="text-slate-900" strokeWidth={2.2} />
          <span className="font-bold text-slate-900 text-[15px] tracking-tight">
            Toodle - Wits Tutor Management
          </span>
        </div>

        <span className="font-mono text-xs text-slate-400 tracking-wide">
          Version 2.1.0
        </span>
      </div>
    </header>
  );
}