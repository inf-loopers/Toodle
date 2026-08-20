/**
 * @file Navbar.jsx
 * @description Top navigation bar component.
 *
 * Responsibilities:
 * - Displays the Toodle logo, system name, and Wits SDP badge.
 * - Mobile hamburger toggle button to open/close the responsive Sidebar.
 * - Authenticated user section: displays user avatar, display name, role badge, and quick logout button.
 * - Sticky header positioning with translucent backdrop blur effect.
 *
 * Props:
 * - isSidebarOpen: Boolean indicating mobile sidebar drawer state.
 * - onToggleSidebar: Function callback to toggle mobile sidebar drawer.
 */

export default function Navbar() {
  // TODO: Implement Navbar with user profile & role badge
    return (
    <div className="flex py-0 px-6 justify-between items-center border-b border-b-[#C3C6D1] bg-[#FFF] min-w-screen min-h-screen absolute left-0 top-0">
      <div className="flex items-center gap-2 w-fit">
        <svg
          width="22"
          height="18"
          viewBox="0 0 22 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="flex flex-col items-start w-fit "
        >
          <path
            d="M20 14V7.1L11 12L0 6L11 0L22 6V14H20ZM11 18L4 14.2V9.2L11 13L18 9.2V14.2L11 18Z"
            fill="#001E40"
          />
        </svg>
        <div className="flex flex-col items-start w-fit">
          <p className="text-[#001E40] font-hankenGrotesk text-lg font-bold leading-6 w-fit">
            Toodle - Wits Tutor Management
          </p>
        </div>
      </div>
      <div className="flex flex-col items-start w-fit">
        <p className="text-[#43474F] font-jetBrainsMono text-xs font-medium leading-4 w-fit tracking-[0.02em]">
          Version 2.1.0
        </p>
      </div>
    </div>
  );
}

