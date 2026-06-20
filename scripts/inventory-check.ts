/**
 * inventory-check.ts
 *
 * Read-only integrity check for content/video-inventory.json.
 *
 * Verifies:
 *   - 28 records (configurable but defaults to course.totalLessons)
 *   - order 1..N with no gaps and no duplicates
 *   - lessonId unique
 *   - slug unique
 *   - expectedFileName unique
 *   - expectedVideoPath format matches /videos/<expectedFileName>
 *   - no orphan mp4 files in public/videos/ that aren't in the inventory
 *
 * Exits non-zero if any check fails. Otherwise exits 0.
 *
 * Usage:
 *   npm run inventory:check
 */

import fs from 'node:fs';
import path from 'node:path';

const PUBLIC_VIDEOS_DIR = path.join(process.cwd(), 'public', 'videos');
const COURSE_JSON_PATH = path.join(process.cwd(), 'content', 'course.json');
const INVENTORY_PATH = path.join(process.cwd(), 'content', 'video-inventory.json');

interface InventoryRecord {
  order: number;
  lessonId: string;
  slug: string;
  title: string;
  moduleId: string;
  moduleTitle: string;
  expectedFileName: string;
  expectedVideoPath: string;
  duration: string;
  durationSeconds: number;
  downloaded: boolean;
  fileExists: boolean;
  fileSizeBytes: number | null;
  generatedPath: string;
  aiStatus: string;
  reviewStatus: string;
}

interface InventoryJson {
  schemaVersion: number;
  generatedAt: string;
  courseId: string;
  courseTitle: string;
  totalExpected: number;
  lessons: InventoryRecord[];
}

interface CheckResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

function checkInventory(): CheckResult {
  const result: CheckResult = { ok: true, errors: [], warnings: [], info: [] };

  if (!fs.existsSync(INVENTORY_PATH)) {
    result.errors.push(`Inventory file not found at ${INVENTORY_PATH}`);
    result.ok = false;
    return result;
  }

  const inv = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8')) as InventoryJson;
  const course = JSON.parse(fs.readFileSync(COURSE_JSON_PATH, 'utf8')) as {
    totalLessons: number;
    id: string;
  };

  // 1. totalExpected matches course.totalLessons.
  if (inv.totalExpected !== course.totalLessons) {
    result.errors.push(
      `totalExpected (${inv.totalExpected}) does not match course.totalLessons (${course.totalLessons}).`,
    );
  }

  // 2. lessons array length.
  if (inv.lessons.length !== inv.totalExpected) {
    result.errors.push(
      `lessons.length (${inv.lessons.length}) does not match totalExpected (${inv.totalExpected}).`,
    );
  }

  // 3. order: 1..N no gaps no dupes.
  const orders = inv.lessons.map((r) => r.order).sort((a, b) => a - b);
  const dupOrders = orders.filter((o, i) => orders.indexOf(o) !== i);
  if (dupOrders.length) {
    result.errors.push(`Duplicate orders: ${dupOrders.join(', ')}`);
  }
  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i + 1) {
      result.errors.push(
        `Order gap at position ${i + 1}: expected ${i + 1}, got ${orders[i]}.`,
      );
      break;
    }
  }

  // 4. lessonId unique.
  const ids = inv.lessons.map((r) => r.lessonId);
  const dupIds = ids.filter((v, i) => ids.indexOf(v) !== i);
  if (dupIds.length) {
    result.errors.push(`Duplicate lessonId: ${dupIds.join(', ')}`);
  }

  // 5. slug unique.
  const slugs = inv.lessons.map((r) => r.slug);
  const dupSlugs = slugs.filter((v, i) => slugs.indexOf(v) !== i);
  if (dupSlugs.length) {
    result.errors.push(`Duplicate slug: ${dupSlugs.join(', ')}`);
  }

  // 6. expectedFileName unique.
  const fnames = inv.lessons.map((r) => r.expectedFileName);
  const dupFnames = fnames.filter((v, i) => fnames.indexOf(v) !== i);
  if (dupFnames.length) {
    result.errors.push(`Duplicate expectedFileName: ${dupFnames.join(', ')}`);
  }

  // 7. expectedVideoPath matches /videos/<expectedFileName>.
  for (const r of inv.lessons) {
    const expected = `/videos/${r.expectedFileName}`;
    if (r.expectedVideoPath !== expected) {
      result.errors.push(
        `lessonId ${r.lessonId}: expectedVideoPath "${r.expectedVideoPath}" does not match "/videos/${r.expectedFileName}".`,
      );
    }
  }

  // 8. required fields present.
  const required: (keyof InventoryRecord)[] = [
    'order',
    'lessonId',
    'slug',
    'title',
    'moduleId',
    'moduleTitle',
    'expectedFileName',
    'expectedVideoPath',
    'duration',
    'durationSeconds',
    'downloaded',
    'fileExists',
    'fileSizeBytes',
    'generatedPath',
    'aiStatus',
    'reviewStatus',
  ];
  for (const r of inv.lessons) {
    for (const field of required) {
      if (!(field in r)) {
        result.errors.push(`lessonId ${r.lessonId}: missing field "${field}".`);
      }
    }
  }

  // 9. orphan mp4 detection.
  if (fs.existsSync(PUBLIC_VIDEOS_DIR)) {
    const onDisk = fs
      .readdirSync(PUBLIC_VIDEOS_DIR)
      .filter((f) => f.toLowerCase().endsWith('.mp4'));
    const expectedSet = new Set(fnames);
    const orphans = onDisk.filter((f) => !expectedSet.has(f));
    if (orphans.length) {
      result.errors.push(
        `Orphan MP4 in public/videos not in inventory (${orphans.length}): ${orphans.join(', ')}`,
      );
    }
    result.info.push(`MP4 on disk: ${onDisk.length}, expected: ${fnames.length}`);
  }

  // 10. summary info.
  result.info.push(`Inventory records: ${inv.lessons.length}`);
  result.info.push(`Marked downloaded: ${inv.lessons.filter((r) => r.downloaded).length}`);
  result.info.push(`fileExists=true:   ${inv.lessons.filter((r) => r.fileExists).length}`);

  result.ok = result.errors.length === 0;
  return result;
}

function main() {
  console.log('─'.repeat(72));
  console.log('Wave Up — Video Inventory Check');
  console.log('─'.repeat(72));

  const result = checkInventory();

  console.log('');
  for (const msg of result.info) console.log(`ℹ ${msg}`);
  console.log('');

  if (result.warnings.length) {
    console.log(`Warnings (${result.warnings.length}):`);
    for (const w of result.warnings) console.log(`  ⚠ ${w}`);
    console.log('');
  }

  if (result.errors.length) {
    console.log(`Errors (${result.errors.length}):`);
    for (const e of result.errors) console.log(`  ✗ ${e}`);
    console.log('');
    console.log('✗ Inventory check FAILED');
    process.exit(1);
  }

  console.log('✓ Inventory check passed');
}

try {
  main();
} catch (err) {
  console.error('Fatal error:', err);
  process.exit(1);
}