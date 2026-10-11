import logo from '../../assets/toodle_tutor_management_logo.png';

let prepared;
const clamp = (value) => Math.max(0, Math.min(1, value));

// Shade the original opaque shapes; alpha, geometry and proportions stay intact.
// Each connected shape gets its own curved highlight and a narrow lit bevel.
export function lightWelcomeLogo({ data, width, height }) {
  const count = width * height;
  const materials = new Uint8Array(count);
  const shapes = new Uint32Array(count);
  const queue = new Uint32Array(count);
  for (let pixel = 0; pixel < count; pixel++) {
    const offset = pixel * 4;
    if (data[offset + 3] < 16) continue;
    materials[pixel] =
      data[offset] > 150 && data[offset + 1] > 90 && data[offset + 2] < 130 ? 1 : 2;
  }
  let shape = 0;
  const bevel = Math.max(1, Math.round(width / 110));
  for (let start = 0; start < count; start++) {
    if (!materials[start] || shapes[start]) continue;
    shape++;
    const material = materials[start];
    let head = 0;
    let tail = 1;
    queue[0] = start;
    shapes[start] = shape;
    let left = width;
    let right = 0;
    let top = height;
    let bottom = 0;
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      for (const neighbor of [
        x > 0 ? pixel - 1 : -1,
        x < width - 1 ? pixel + 1 : -1,
        y > 0 ? pixel - width : -1,
        y < height - 1 ? pixel + width : -1,
      ]) {
        if (neighbor < 0 || shapes[neighbor] || materials[neighbor] !== material) continue;
        shapes[neighbor] = shape;
        queue[tail++] = neighbor;
      }
    }
    // Tiny antialiasing flecks retain their original colour.
    if (tail < 20) continue;
    const alphaAt = (x, y) =>
      x < 0 || x >= width || y < 0 || y >= height || shapes[y * width + x] !== shape
        ? 0
        : data[(y * width + x) * 4 + 3] / 255;
    // Retain the tutor's original orange-gold colour beneath its highlights.
    // Blue keeps a saturated royal-blue body with cooler reflections.
    const blueBase = [18, 101, 214];
    const reflection = material === 1 ? [255, 247, 195] : [147, 216, 255];
    const warm = material === 1 ? [255, 225, 101] : [106, 153, 216];
    for (let index = 0; index < tail; index++) {
      const pixel = queue[index];
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      const u = (x - left) / Math.max(1, right - left);
      const v = (y - top) / Math.max(1, bottom - top);
      const curvedLight = Math.exp(-(((u - 0.34) / 0.52) ** 2 + ((v - 0.28) / 0.62) ** 2));
      const gloss = Math.exp(-(((u - 0.29) / 0.2) ** 2 + ((v - 0.19) / 0.15) ** 2));
      const normalX = alphaAt(x + bevel, y) - alphaAt(x - bevel, y);
      const normalY = alphaAt(x, y + bevel) - alphaAt(x, y - bevel);
      const edgeLight = clamp((normalX + normalY) / 2);
      const edgeShade = clamp(-(normalX + normalY) / 2);
      const shade = 0.8 + curvedLight * 0.2 - edgeShade * 0.12;
      const highlight = clamp(gloss * 0.17 + edgeLight * 0.3);
      const floorLight = v ** 3 * 0.1;
      for (let channel = 0; channel < 3; channel++) {
        const base = material === 1 ? data[pixel * 4 + channel] : blueBase[channel];
        const lit = base * shade;
        const glossy = lit + (reflection[channel] - lit) * highlight;
        data[pixel * 4 + channel] = glossy + (warm[channel] - glossy) * floorLight;
      }
    }
  }
}

// Prepare once per page load so repeat visits reuse the same sharp welcome finish.
export function prepareWelcomeLogo() {
  if (prepared) return prepared;
  const surface = document.createElement('canvas');
  const context = surface.getContext('2d', { willReadFrequently: true });
  if (!context) return Promise.resolve({ src: logo });
  prepared = new Promise((resolve, reject) => {
    const original = new Image();
    original.onload = () => {
      try {
        surface.width = original.naturalWidth;
        surface.height = original.naturalHeight;
        context.drawImage(original, 0, 0);
        const pixels = context.getImageData(0, 0, surface.width, surface.height);
        lightWelcomeLogo(pixels);
        context.putImageData(pixels, 0, 0);
        resolve({ surface, src: surface.toDataURL('image/png') });
      } catch (error) {
        reject(error);
      }
    };
    original.onerror = reject;
    original.src = logo;
  });
  return prepared;
}
