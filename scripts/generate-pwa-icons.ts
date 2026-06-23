/**
 * Generate PWA icon variants from a single source PNG.
 *
 * Input:  <root>/icona.png                  (any square ≥ 512px)
 * Output: public/icons/*.png                (192, 512, maskable-512, apple-touch)
 *
 * Variants:
 *   - icon-192.png         192×192   plain (fits manifest "any")
 *   - icon-512.png         512×512   plain (splash / app stores)
 *   - apple-touch-icon.png 180×180   iOS home screen
 *   - icon-maskable-512.png 512×512  +10% transparent padding for safe zone
 *
 * The maskable safe zone is the inner 80% of the icon: anything outside
 * may be cropped by Android launchers (circle / squircle / teardrop masks).
 * We add 10% padding all around, which keeps the original artwork centred
 * and visible across all mask shapes.
 *
 * Run: `npm run generate:pwa-icons`
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp, { type Sharp } from 'sharp';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'icona.png');
const OUT_DIR = path.join(ROOT, 'public', 'icons');

// Match the manifest theme_color / background_color so any transparent
// margin blends with the install splash.
const BG = { r: 10, g: 10, b: 20, alpha: 1 }; // #0a0a14

type Variant = {
  file: string;
  size: number;
  /** Extra padding percentage (0 = none, 10 = maskable safe zone). */
  paddingPct: number;
};

const VARIANTS: Variant[] = [
  { file: 'icon-192.png', size: 192, paddingPct: 0 },
  { file: 'icon-512.png', size: 512, paddingPct: 0 },
  { file: 'apple-touch-icon.png', size: 180, paddingPct: 0 },
  { file: 'icon-maskable-512.png', size: 512, paddingPct: 10 },
];

async function ensureOutDir(): Promise<void> {
  if (!existsSync(OUT_DIR)) {
    await mkdir(OUT_DIR, { recursive: true });
  }
}

async function loadSource(): Promise<Buffer> {
  if (!existsSync(SOURCE)) {
    throw new Error(`Source icon not found at ${SOURCE}`);
  }
  return readFile(SOURCE);
}

async function makeVariant(source: Buffer, v: Variant): Promise<void> {
  const target = path.join(OUT_DIR, v.file);
  let pipeline: Sharp;

  if (v.paddingPct === 0) {
    pipeline = sharp(source).resize(v.size, v.size, {
      fit: 'contain',
      background: BG,
    });
  } else {
    // Maskable: shrink the artwork to (100 - 2*paddingPct)% and centre it
    // on a solid BG canvas the size of the output.
    const innerSize = Math.round(v.size * (1 - v.paddingPct / 50));
    const pad = (v.size - innerSize) / 2;
    pipeline = sharp(source)
      .resize(innerSize, innerSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .extend({
        top: pad,
        bottom: pad,
        left: pad,
        right: pad,
        background: BG,
      });
  }

  const buf = await pipeline.png({ compressionLevel: 9 }).toBuffer();
  await writeFile(target, buf);
  console.log(
    `  ✓ ${v.file} (${v.size}×${v.size}${v.paddingPct ? `, +${v.paddingPct}% pad` : ''}) ${buf.length.toLocaleString()} bytes`,
  );
}

async function main(): Promise<void> {
  console.log(`[generate-pwa-icons] source: ${SOURCE}`);
  console.log(`[generate-pwa-icons] output: ${OUT_DIR}`);
  await ensureOutDir();
  const source = await loadSource();
  const meta = await sharp(source).metadata();
  console.log(
    `[generate-pwa-icons] input: ${meta.width}×${meta.height} ${meta.format} ${meta.size?.toLocaleString() ?? '?'} bytes`,
  );

  for (const v of VARIANTS) {
    await makeVariant(source, v);
  }

  console.log(`\n[generate-pwa-icons] done — ${VARIANTS.length} variants written`);
}

main().catch((err) => {
  console.error('[generate-pwa-icons] fatal:', err);
  process.exit(1);
});