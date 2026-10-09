/**
 * @file optimize-images.mjs
 * @description One-shot image optimisation helper for the Toodle frontend.
 *
 * Re-encodes the large raster assets under `src/assets` into WebP so the
 * landing/login/app-shell pages ship far fewer bytes. Rasters that are only
 * ever displayed small (e.g. the logo, shown at <=64px) are also downscaled
 * to a display-appropriate resolution. Original PNGs are kept on disk as the
 * source masters and, where useful, a resized PNG is emitted as the
 * `<picture>` fallback for browsers without WebP support.
 *
 * This is a developer tool (run via `npm run images:optimize`); it is not
 * part of the production build. The generated assets are committed so CI and
 * other developers do not need `sharp` at build time.
 *
 * Usage:
 *   npm run images:optimize
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(here, '..', 'src', 'assets');

// WebP quality tuned for a good size/quality balance on illustrative art.
const WEBP_QUALITY = 82;

/**
 * Each target describes one source raster and the optimised outputs to emit.
 * - `input`:   source file in src/assets (kept as the master).
 * - `width`:   optional max width; larger sources are downscaled to it.
 * - `webp`:    output WebP filename (always emitted).
 * - `pngOut`:  optional resized PNG fallback filename (for <picture>).
 */
const TARGETS = [
  {
    input: 'toodle_hero_part1.png',
    webp: 'toodle_hero_part1.webp',
    // Hero is displayed at ~585px; the 1254px master already covers 2x retina.
  },
  {
    input: 'toodle_tutor_management_logo.png',
    width: 256, // Displayed at <=64px; 256px covers 4x and stays crisp.
    webp: 'toodle_logo_256.webp',
    pngOut: 'toodle_logo_256.png',
  },
];

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

async function optimise({ input, width, webp, pngOut }) {
  const source = await readFile(join(assetsDir, input));
  let pipeline = sharp(source);
  if (width) pipeline = pipeline.resize({ width, withoutEnlargement: true });

  const webpBuffer = await pipeline.clone().webp({ quality: WEBP_QUALITY }).toBuffer();
  await writeFile(join(assetsDir, webp), webpBuffer);

  let line = `${input} (${kb(source.length)}) -> ${webp} (${kb(webpBuffer.length)})`;

  if (pngOut) {
    const pngBuffer = await pipeline.clone().png({ compressionLevel: 9 }).toBuffer();
    await writeFile(join(assetsDir, pngOut), pngBuffer);
    line += ` + ${pngOut} (${kb(pngBuffer.length)}) fallback`;
  }

  console.log(line);
}

for (const target of TARGETS) {
  await optimise(target);
}

console.log('Done. Optimised assets written to src/assets.');
