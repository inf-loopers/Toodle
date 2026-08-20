import React from "react";
import { ShieldCheck } from "lucide-react";

export default function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-2 bg-slate-900 rounded-full px-4 py-1.5 text-xs font-mono tracking-wide text-white">
      <ShieldCheck size={13} strokeWidth={2} />
      {children}
    </span>
  );
}