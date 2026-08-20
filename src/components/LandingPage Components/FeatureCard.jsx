import React from "react";

/**
 * FeatureCard
 * iconBg: tailwind background class for the icon tile (e.g. "bg-blue-100")
 * iconColor: tailwind text color class for the icon (e.g. "text-blue-600")
 */
export default function FeatureCard({ icon: Icon, iconBg, iconColor, title, description }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-200/60 p-8 flex-1">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon size={20} className={iconColor} strokeWidth={2} />
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>

      <p className="mt-2.5 text-sm text-slate-500 leading-relaxed">
        {description}
      </p>
    </div>
  );
}