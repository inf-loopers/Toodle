import { describe, expect, it } from 'vitest';
import { lightWelcomeLogo } from '../src/components/auth/welcomeLogo';

function originalShapes() {
  const width = 36;
  const height = 20;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gold = (x - 10) ** 2 + (y - 10) ** 2 <= 64;
      const blue = (x - 28) ** 2 + (y - 10) ** 2 <= 36;
      if (!gold && !blue) continue;
      data.set(gold ? [255, 183, 3, 255] : [0, 56, 121, 255], (y * width + x) * 4);
    }
  }
  // A partially transparent edge belongs to the original silhouette too.
  data.set([255, 183, 3, 90], (10 * width + 1) * 4);
  return { data, width, height };
}

describe('Welcome-only logo material lighting', () => {
  it('preserves every alpha value and all transparent space in the original artwork', () => {
    const pixels = originalShapes();
    const original = pixels.data.slice();
    lightWelcomeLogo(pixels);
    for (let offset = 0; offset < original.length; offset += 4) {
      expect(pixels.data[offset + 3]).toBe(original[offset + 3]);
      if (!original[offset + 3])
        expect(pixels.data.slice(offset, offset + 4)).toEqual(original.slice(offset, offset + 4));
    }
  });

  it('retains the original orange-gold tone and dimensional highlights without washing out blue', () => {
    const pixels = originalShapes();
    const original = pixels.data.slice();
    lightWelcomeLogo(pixels);
    const goldColors = new Set();
    const blueColors = new Set();
    for (let offset = 0; offset < original.length; offset += 4) {
      if (original[offset + 3] !== 255) continue;
      const [red, green, blue] = pixels.data.slice(offset, offset + 3);
      if (original[offset] === 255) {
        goldColors.add(`${red},${green},${blue}`);
        expect(red).toBeGreaterThan(green);
        expect(green).toBeGreaterThan(blue);
      } else {
        blueColors.add(`${red},${green},${blue}`);
        expect(blue).toBeGreaterThan(green);
        expect(green).toBeGreaterThan(red);
      }
    }
    const center = (10 * pixels.width + 10) * 4;
    expect(pixels.data[center + 1]).toBeGreaterThan(original[center + 1] - 20);
    expect(pixels.data[center + 1]).toBeLessThan(original[center + 1] + 10);
    expect(pixels.data[center + 2]).toBeLessThan(original[center + 2] + 20);
    expect(goldColors.size).toBeGreaterThan(20);
    expect(blueColors.size).toBeGreaterThan(20);
  });
});
