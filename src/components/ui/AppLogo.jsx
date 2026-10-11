/**
 * @file AppLogo.jsx
 * @description Shared Toodle logo image with modern-format optimisation.
 *
 * Responsibilities:
 * - Renders the Toodle logo inside a `<picture>` so browsers that support WebP
 *   download the ~13 kB `toodle_logo_256.webp`, while older browsers fall back
 *   to the resized `toodle_logo_256.png` (~29 kB) instead of the ~520 kB master.
 * - Accepts `className`/`alt` and forwards any other props to the `<img>`, so
 *   each surface (navbar, landing navbar, login, onboarding) keeps its sizing.
 * - Sets square `width`/`height` attributes to reserve aspect ratio and avoid
 *   layout shift (CLS); CSS classes still control the rendered size.
 *
 * Expected Usage:
 * ```jsx
 * <AppLogo className="h-9 w-9 object-contain" alt="" />
 * ```
 */

import logoWebp from '../../assets/toodle_logo_256.webp';
import logoPng from '../../assets/toodle_logo_256.png';

export function AppLogo({ className, alt = 'Toodle logo', width = 64, height = 64, ...rest }) {
  return (
    <picture>
      <source srcSet={logoWebp} type="image/webp" />
      <img
        src={logoPng}
        alt={alt}
        className={className}
        width={width}
        height={height}
        decoding="async"
        {...rest}
      />
    </picture>
  );
}

export default AppLogo;
