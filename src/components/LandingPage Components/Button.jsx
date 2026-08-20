import React from "react";

/**
 * Button
 * A small reusable button component.
 *
 * variant:
 *  - "primary": solid navy button (used for "Sign In to Portal")
 *  - "ghost":   text-only button (used for footer links)
 */
export default function Button({
  children,
  variant = "primary",
  icon: Icon,
  onClick,
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-500";

  const variants = {
    primary:
      "bg-slate-900 hover:bg-slate-800 text-white text-sm md:text-base rounded-xl px-6 py-3.5 shadow-sm",
    ghost:
      "text-slate-500 hover:text-slate-800 text-sm font-normal gap-1.5",
  };

  return (
    <button
      onClick={onClick}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
      {Icon && <Icon size={variant === "primary" ? 18 : 15} strokeWidth={4} />}
    </button>
  );
}