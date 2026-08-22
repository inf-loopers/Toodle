/**
 * @file SocialButton.jsx
 * @description Reusable alternative login button for SSO providers (Wits Staff
 *              SSO, Google, etc.). Renders a bordered white button with an icon
 *              on the left and provider label text.
 *
 * Responsibilities:
 * - Renders a consistent styled button for each social / SSO login provider.
 * - Accepts an `icon` (React element) and `label` (string) for flexibility.
 * - Calls `onClick` when clicked — typically triggers Auth0's
 *   `loginWithRedirect` with a connection-specific `authorizationParams`.
 * - Supports a `disabled` prop for loading states.
 *
 * Usage:
 *   <SocialButton
 *     icon={<Building2 />}
 *     label="Wits Staff SSO"
 *     onClick={handleWitsSSO}
 *   />
 */

import React from 'react';

/**
 * SocialButton
 *
 * @param {object} props
 * @param {React.ReactNode} props.icon - The icon element displayed on the left.
 * @param {string} props.label - The text label for the button.
 * @param {Function} props.onClick - Click handler for the button.
 * @param {boolean} [props.disabled=false] - Whether the button is disabled.
 * @param {string} [props.className] - Additional TailwindCSS classes.
 */
export default function SocialButton({
  icon,
  label,
  onClick,
  disabled = false,
  className = '',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex w-full items-center justify-center gap-3
        rounded-lg border border-slate-300 bg-white
        px-4 py-2.5 text-sm font-medium text-slate-700
        transition-all duration-150
        hover:border-slate-400 hover:bg-slate-50
        focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500
        focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        ${className}
      `}
    >
      {/* Icon container — ensures consistent sizing */}
      <span className="flex h-5 w-5 items-center justify-center">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}