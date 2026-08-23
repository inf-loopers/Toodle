import React from "react";
import { ShieldCheck } from "lucide-react";

export default function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs font-mono tracking-wide text-blue-50">
      <ShieldCheck size={13} strokeWidth={2} />
      {children}
    </span>
  );
}