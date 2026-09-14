/**
 * @file useIsMobile.js
 * @description Viewport breakpoint hook for responsive interaction switching.
 *
 * Responsibilities:
 * - Tracks whether the viewport is below the `lg` (1024px) Tailwind breakpoint,
 *   the same breakpoint where the Allocation Board switches from the
 *   side-by-side desktop layout to the stacked mobile layout.
 * - Lets interaction patterns degrade gracefully: drag-and-drop is desktop-only,
 *   while mobile users get tap-to-assign / modal-only flows.
 *
 * Returns:
 * - `isMobile: boolean` — true when viewport width < 1024px.
 *
 * Expected Usage:
 * ```jsx
 * const isMobile = useIsMobile();
 * const dndEnabled = !isMobile;
 * ```
 */

import { useState, useEffect } from 'react';

/** Matches Tailwind's `lg` breakpoint ceiling — i.e. everything below `lg:`. */
const MOBILE_QUERY = '(max-width: 1023px)';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

export default useIsMobile;
