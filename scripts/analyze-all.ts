/**
 * analyze-all.ts
 *
 * Iterates over every lesson in course.json and runs analyze-video.ts
 * logic for each one (in-process; no subprocess spawning).
 *
 * Useful after dropping new videos in /public/videos/.
 *
 * Usage:
 *   npm run analyze:all
 *   npm run analyze:all -- --only-imported    # skip lessons without a local file
 */

import path from 'node:path';
import fs from 'node:fs';
import courseJson from '../content/course.json';
import {
  analyzeVideoWithMiniMax,
  generateLessonFiles,
  isMiniMaxConfigured,
  normalizeMiniMaxOutput,
  uploadVideoToMiniMax,
} from '../lib/ai/minimax';

const course = courseJson as typeof courseJson;

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

async function main() {
  const onlyImported = hasFlag('only-imported');
  console.log('─'.repeat(72));
  console.log(`HTR Training Brain — Analyze ALL videos`);
  console.log(`Mode   : ${isMiniMaxConfigured() ? 'API configured (mock fallback)' : 'mock (no API key)'}`);
  console.log(`Filter : ${onlyImported ? 'only-imported' : 'all lessons'}`);
  console.log('─'.repeat(72));

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const failures: { slug: string; title: string; error: string }[] = [];

  for (const lesson of course.lessons) {
    const videoFull = path.join(process.cwd(), 'public', lesson.videoPath);
    const present = fs.existsSync(videoFull);
    if (onlyImported && !present) {
      console.log(`⤴  Skipping ${lesson.slug} (no local video)`);
      skipped++;
      continue;
    }
    console.log(`\n▶ ${lesson.title}  [${lesson.slug}]`);
    if (!present) {
      console.log(`  ⚠ Local video not present — analyzing from metadata only.`);
    }

    try {
      await uploadVideoToMiniMax(lesson.videoPath);
      const raw = await analyzeVideoWithMiniMax(lesson.videoPath);
      const normalized = normalizeMiniMaxOutput(raw);
      const written = await generateLessonFiles(lesson.slug, normalized);
      console.log(`  ✓ wrote ${written.length} files`);
      processed++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      failures.push({ slug: lesson.slug, title: lesson.title, error: message });
      console.error(`  ✗ FAILED: ${message.slice(0, 300)}`);
    }

    // Small delay to avoid hammering the API and to keep local ffmpeg cool.
    if (course.lessons.indexOf(lesson) < course.lessons.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log('\n─'.repeat(72));
  console.log(`Done. Processed ${processed} lessons, skipped ${skipped}, failed ${failed}.`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log(`  - ${f.slug}: ${f.error.slice(0, 200)}`);
    }
    process.exitCode = 1;
  }
  console.log('Open the dashboard or /library to inspect the output.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
