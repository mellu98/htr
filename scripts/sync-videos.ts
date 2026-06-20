/**
 * sync-videos.ts
 *
 * Authoritative source: content/video-inventory.json (28 records).
 *
 * For every record in the inventory, check public/videos/<expectedFileName>
 * and update:
 *   - downloaded       (matches fileExists after sync)
 *   - fileExists       (does the MP4 exist on disk?)
 *   - fileSizeBytes    (size in bytes if present)
 *   - duration / durationSeconds  (read from ffprobe if available, else warn)
 *
 * Then propagate the inventory state into content/course.json so the rest
 * of the app sees the same metadata.
 *
 * IMPORTANT — DO NOT modify:
 *   - slug, lessonId, order
 *   - moduleId, moduleTitle
 *   - title
 *   - totalLessons
 *
 * This script NEVER adds or removes lessons. It never touches
 * content/generated/<slug>/ folders.
 *
 * Orphan detection: any *.mp4 in public/videos whose filename is not in the
 * inventory's expectedFileName list is reported as ORPHAN but never deleted.
 *
 * Usage:
 *   npm run sync:videos
 *
 * Output:
 *   - Final report: found, missing, orphans, durations updated, warnings.
 */

import { spawnSync } from 'node:child_process';
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
}

interface InventoryJson {
  schemaVersion: number;
  generatedAt: string;
  courseId: string;
  courseTitle: string;
  totalExpected: number;
  lessons: InventoryRecord[];
}

interface CourseLesson {
  id: string;
  moduleId: string;
  moduleTitle: string;
  slug: string;
  title: string;
  duration: string;
  durationSeconds: number;
  videoPath: string;
  order: number;
  videoFileExists?: boolean;
  fileSizeBytes?: number;
}

interface CourseJson {
  id: string;
  title: string;
  totalLessons: number;
  modules: unknown[];
  lessons: CourseLesson[];
}

interface ReportStats {
  expected: number;
  found: number;
  missing: number;
  orphans: number;
  durationUpdated: number;
  durationSkipped: number;
  warnings: string[];
  orphanFiles: string[];
}

/**
 * Try ffprobe. Return duration in seconds as a number, or null if ffprobe is
 * not available / fails. Never throws — always returns null on failure.
 */
function readDurationWithFfprobe(filePath: string): number | null {
  const result = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ],
    { encoding: 'utf8', timeout: 15000 },
  );
  if (result.error || result.status !== 0) return null;
  const raw = (result.stdout ?? '').trim();
  if (!raw) return null;
  const seconds = Number.parseFloat(raw);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.round(seconds);
}

/** Format seconds as "MM:SS" or "H:MM:SS". */
function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${m}:${ss}`;
}

/**
 * Scan public/videos/*.mp4 and return the basenames that are NOT in the
 * inventory's expectedFileName list.
 */
function detectOrphans(inventoryFilenames: Set<string>): string[] {
  if (!fs.existsSync(PUBLIC_VIDEOS_DIR)) return [];
  const onDisk = fs
    .readdirSync(PUBLIC_VIDEOS_DIR)
    .filter((f) => f.toLowerCase().endsWith('.mp4'));
  return onDisk
    .filter((f) => !inventoryFilenames.has(f))
    .sort();
}

function main() {
  console.log('─'.repeat(72));
  console.log('Wave Up — Sync videos ↔ inventory ↔ course.json');
  console.log('─'.repeat(72));

  if (!fs.existsSync(INVENTORY_PATH)) {
    console.error(`✗ Inventory not found at ${INVENTORY_PATH}`);
    console.error('  Run inventory:check or create content/video-inventory.json first.');
    process.exit(1);
  }
  if (!fs.existsSync(COURSE_JSON_PATH)) {
    console.error(`✗ course.json not found at ${COURSE_JSON_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(PUBLIC_VIDEOS_DIR)) {
    console.error(`✗ public/videos not found at ${PUBLIC_VIDEOS_DIR}`);
    process.exit(1);
  }

  const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8')) as InventoryJson;
  const course = JSON.parse(fs.readFileSync(COURSE_JSON_PATH, 'utf8')) as CourseJson;

  // Detect ffprobe availability (run once).
  const ffprobeProbe = spawnSync('ffprobe', ['-version'], { encoding: 'utf8' });
  const ffprobeAvailable = ffprobeProbe.status === 0;
  if (!ffprobeAvailable) {
    console.log('⚠ ffprobe not in PATH — durations will be preserved (not updated).');
  } else {
    const v = (ffprobeProbe.stdout ?? '').split('\n')[0]?.trim() ?? 'ffprobe';
    console.log(`✓ ffprobe available (${v})`);
  }

  const stats: ReportStats = {
    expected: inventory.lessons.length,
    found: 0,
    missing: 0,
    orphans: 0,
    durationUpdated: 0,
    durationSkipped: 0,
    warnings: [],
    orphanFiles: [],
  };

  const inventoryByLessonId = new Map<string, InventoryRecord>();
  const inventoryBySlug = new Map<string, InventoryRecord>();
  const inventoryFilenames = new Set<string>();
  for (const r of inventory.lessons) {
    inventoryByLessonId.set(r.lessonId, r);
    inventoryBySlug.set(r.slug, r);
    inventoryFilenames.add(r.expectedFileName);
  }

  // Update each inventory record from disk.
  for (const record of inventory.lessons) {
    const fullPath = path.join(PUBLIC_VIDEOS_DIR, record.expectedFileName);
    if (!fs.existsSync(fullPath)) {
      record.fileExists = false;
      record.downloaded = false;
      record.fileSizeBytes = null;
      stats.missing++;
      continue;
    }

    const stat = fs.statSync(fullPath);
    record.fileExists = true;
    record.downloaded = true;
    record.fileSizeBytes = stat.size;
    stats.found++;

    if (!ffprobeAvailable) {
      stats.durationSkipped++;
      continue;
    }

    const seconds = readDurationWithFfprobe(fullPath);
    if (seconds === null) {
      stats.durationSkipped++;
      stats.warnings.push(
        `ffprobe failed for ${record.expectedFileName} — duration kept as ${record.duration} (${record.durationSeconds}s).`,
      );
      continue;
    }
    record.durationSeconds = seconds;
    record.duration = formatDuration(seconds);
    stats.durationUpdated++;
  }

  // Detect orphans.
  const orphans = detectOrphans(inventoryFilenames);
  stats.orphans = orphans.length;
  stats.orphanFiles = orphans;
  for (const o of orphans) {
    stats.warnings.push(`ORPHAN MP4 in public/videos not in inventory: ${o}`);
  }

  // Propagate inventory → course.json.
  // Match by lessonId. NEVER add or remove lessons. NEVER change slug/order.
  for (const lesson of course.lessons) {
    const inv = inventoryByLessonId.get(lesson.id);
    if (!inv) {
      stats.warnings.push(
        `Lesson ${lesson.id} (${lesson.slug}) in course.json has no matching inventory record — left untouched.`,
      );
      continue;
    }
    lesson.videoFileExists = inv.fileExists;
    if (inv.fileSizeBytes !== null) {
      lesson.fileSizeBytes = inv.fileSizeBytes;
    } else {
      delete lesson.fileSizeBytes;
    }
    // Update duration only if ffprobe succeeded.
    if (ffprobeAvailable && inv.durationSeconds > 0) {
      lesson.duration = inv.duration;
      lesson.durationSeconds = inv.durationSeconds;
    }
  }

  // Save both files.
  fs.writeFileSync(INVENTORY_PATH, JSON.stringify(inventory, null, 2) + '\n');
  fs.writeFileSync(COURSE_JSON_PATH, JSON.stringify(course, null, 2) + '\n');

  // Report.
  console.log('');
  console.log('Report:');
  console.log(`  Expected (inventory) : ${stats.expected}`);
  console.log(`  Found                : ${stats.found}`);
  console.log(`  Missing              : ${stats.missing}`);
  console.log(`  Orphan mp4 in disk   : ${stats.orphans}`);
  console.log(`  Durations updated    : ${stats.durationUpdated}`);
  console.log(`  Durations skipped    : ${stats.durationSkipped}`);
  if (stats.warnings.length) {
    console.log(`  Warnings (${stats.warnings.length}):`);
    for (const w of stats.warnings) console.log(`    - ${w}`);
  }
  console.log('');
  console.log(`✓ Updated ${path.relative(process.cwd(), INVENTORY_PATH)}`);
  console.log(`✓ Updated ${path.relative(process.cwd(), COURSE_JSON_PATH)}`);
  console.log('  (slug, lessonId, order, totalLessons NOT modified)');
}

try {
  main();
} catch (err) {
  console.error('Fatal error:', err);
  process.exit(1);
}