/**
 * generate-pwa-icons.ts
 *
 * One-off script to generate the Wave Up PWA icon set:
 *   - public/icons/icon-192.png            (192x192, full bleed)
 *   - public/icons/icon-512.png            (512x512, full bleed)
 *   - public/icons/icon-maskable-512.png   (512x512, with 20% safe zone)
 *   - public/icons/apple-touch-icon.png    (180x180, iOS rounded-corner style)
 *
 * Brand:
 *   - Background: diagonal gradient cyan #22d3ee → violet #8b5cf6 → blue #3b82f6
 *   - Foreground: white stylized "W" monogram (rounded chevrons)
 *
 * No external SVG/font deps — every pixel is computed so the script works
 * in a clean checkout with only pngjs installed.
 */

import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'public', 'icons');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Brand colours (RGB)
const CYAN   = { r: 0x22, g: 0xd3, b: 0xee };
const VIOLET = { r: 0x8b, g: 0x5c, b: 0xf6 };
const BLUE   = { r: 0x3b, g: 0x82, b: 0xf6 };
const WHITE  = { r: 0xff, g: 0xff, b: 0xff };

/**
 * Linear interpolation in RGB space — fine for the brand's analogous hues
 * (cyan/violet/blue are far enough apart that a 3-stop gradient is smooth).
 */
function lerp(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

/**
 * Diagonal 3-stop gradient.
 *  t=0  → CYAN (top-left)
 *  t=0.5 → VIOLET
 *  t=1  → BLUE (bottom-right)
 */
function gradientAt(x: number, y: number, size: number) {
  const t = (x + y) / (2 * (size - 1));
  if (t < 0.5) return lerp(CYAN, VIOLET, t * 2);
  return lerp(VIOLET, BLUE, (t - 0.5) * 2);
}

/**
 * Draw a stylised "W" monogram (4 chevrons, rounded) in white at the
 * centre of the canvas, then return the canvas.
 *
 * `scale` is the fraction of the icon height used for the W.
 * The W is positioned within the inner safe zone (maskable uses 0.8×0.8).
 */
function drawMonogram(img: PNG, size: number, safeInset: number) {
  const W = WHITE;
  const height = size * 0.46;                  // monogram height
  const width  = size * 0.66;                  // monogram width
  const top    = (size - height) / 2;          // vertically centred
  const left   = (size - width) / 2;           // horizontally centred

  // 4 chevron strokes (slopes): top-left, bottom-valley, top-right, bottom-valley
  // Built as 4 thick line segments rendered with a small per-pixel brush.
  const strokes: Array<[[number, number], [number, number]]> = [
    [[left,                   top],                [left + width * 0.25,  top + height]], // \
    [[left + width * 0.25,    top + height],      [left + width * 0.50,  top + height * 0.55]], // /
    [[left + width * 0.50,    top + height * 0.55],[left + width * 0.75,  top + height]], // \
    [[left + width * 0.75,    top + height],      [left + width,          top]], // /
  ];

  const strokeWidth = Math.max(4, Math.round(size * 0.085));
  const halfStroke  = strokeWidth / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Skip if outside the monogram bounding box (cheap reject).
      if (x < left - strokeWidth || x > left + width + strokeWidth) continue;
      if (y < top  - strokeWidth || y > top  + height + strokeWidth) continue;

      let onStroke = false;
      for (const [[x1, y1], [x2, y2]] of strokes) {
        // Perpendicular distance from point (x, y) to segment.
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) continue;
        const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        const d2 = (x - projX) ** 2 + (y - projY) ** 2;
        if (d2 <= halfStroke * halfStroke) {
          onStroke = true;
          break;
        }
      }
      if (onStroke) {
        // Round the cap ends with a small soft edge so the W doesn't look pixelated.
        const idx = (y * size + x) << 2;
        img.data[idx]     = W.r;
        img.data[idx + 1] = W.g;
        img.data[idx + 2] = W.b;
        img.data[idx + 3] = 255;
      }
    }
  }
  // unused parameter — safeInset is reserved for future cropping
  void safeInset;
}

/**
 * Generate one icon. `maskable=true` paints a flat background (no rounded
 * mask assumptions) and keeps the W inside a 0.8 safe zone for launchers
 * that crop a circle/squircle.
 */
function makeIcon(size: number, maskable: boolean) {
  const img = new PNG({ width: size, height: size });
  // Full-bleed gradient (or solid for maskable so cropping reveals colour).
  const bg = maskable ? VIOLET : null;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) << 2;
      const c = bg ?? gradientAt(x, y, size);
      img.data[idx]     = c.r;
      img.data[idx + 1] = c.g;
      img.data[idx + 2] = c.b;
      img.data[idx + 3] = 255;
    }
  }
  // Maskable: ensure the W sits inside the central 80% (safe zone).
  const safeInset = maskable ? size * 0.1 : 0;
  drawMonogram(img, size, safeInset);
  return img;
}

function writePng(png: PNG, filename: string) {
  const out = path.join(OUT_DIR, filename);
  fs.writeFileSync(out, PNG.sync.write(png));
  console.log(`✓ ${filename}  (${png.width}x${png.height}, ${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
}

writePng(makeIcon(192, false), 'icon-192.png');
writePng(makeIcon(512, false), 'icon-512.png');
writePng(makeIcon(512, true),  'icon-maskable-512.png');
writePng(makeIcon(180, false), 'apple-touch-icon.png');

console.log(`\nPWA icons generated in ${OUT_DIR}`);
