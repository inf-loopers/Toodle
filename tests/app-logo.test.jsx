/**
 * @file app-logo.test.jsx
 * @description Verifies the shared AppLogo renders an optimised <picture>:
 * a WebP <source> for modern browsers with a resized PNG <img> fallback,
 * while forwarding alt/className and reserving square dimensions (CLS guard).
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AppLogo from '../src/components/ui/AppLogo';

describe('AppLogo', () => {
  it('serves WebP with a PNG fallback inside a <picture>', () => {
    const { container } = render(<AppLogo />);

    const picture = container.querySelector('picture');
    expect(picture).not.toBeNull();

    const source = container.querySelector('source');
    expect(source).not.toBeNull();
    expect(source.getAttribute('type')).toBe('image/webp');
    expect(source.getAttribute('srcset')).toMatch(/\.webp/i);

    const img = screen.getByAltText('Toodle logo');
    expect(img.getAttribute('src')).toMatch(/\.png/i);
  });

  it('forwards alt/className and reserves square dimensions', () => {
    const { container } = render(<AppLogo alt="" className="h-9 w-9 object-contain" />);

    const img = container.querySelector('img');
    expect(img.getAttribute('alt')).toBe('');
    expect(img).toHaveClass('h-9', 'w-9', 'object-contain');
    // Square width/height attributes let the browser reserve aspect ratio.
    expect(img.getAttribute('width')).toBe(img.getAttribute('height'));
  });
});
