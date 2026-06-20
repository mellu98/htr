/**
 * analyze-video.ts
 *
 * Generate all AI outputs for a single lesson and write them to
 * /content/generated/<slug>/.
 *
 * Usage:
 *   npm run analyze:video -- branding-parte-due
 *   npm run analyze:video -- --path /videos/02-branding-parte-due.mp4
 *
 * If MINIMAX_API_KEY is not set, this script produces deterministic mock
 * outputs that exercise the full file pipeline. When the key is set, the
 * call goes through lib/ai/minimax.ts but currently still falls back to mock
 * (see that file for the wiring point).
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

function parseArgs(argv: string[]) {
  const args: { slug?: string; path?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--path' || arg === '-p') {
      args.path = argv[++i];
    } else if (!arg.startsWith('-')) {
      args.slug = arg;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let lesson = args.slug ? course.lessons.find((l) => l.slug === args.slug) : undefined;
  if (!lesson && args.path) {
    lesson = course.lessons.find((l) => l.videoPath === args.path);
  }
  if (!lesson) {
    console.error(
      'Could not find lesson. Pass either a slug or --path /videos/yourfile.mp4',
    );
    process.exit(1);
  }

  console.log('─'.repeat(72));
  console.log(`HTR Training Brain — Analyze video`);
  console.log(`Lesson : ${lesson.title}`);
  console.log(`Slug   : ${lesson.slug}`);
  console.log(`Path   : ${lesson.videoPath}`);
  console.log(
    `Mode   : ${isMiniMaxConfigured() ? 'API configured (mock fallback)' : 'mock (no API key)'}`,
  );
  console.log('─'.repeat(72));

  const videoFullPath = path.join(process.cwd(), 'public', lesson.videoPath);
  if (!fs.existsSync(videoFullPath)) {
    console.warn(
      `⚠ Local video not found at ${videoFullPath}. Continuing — analysis still runs on metadata.`,
    );
  } else {
    console.log(`✓ Local video present (${(fs.statSync(videoFullPath).size / 1024 / 1024).toFixed(1)} MB)`);
  }

  const assetId = await uploadVideoToMiniMax(lesson.videoPath);
  console.log(`Asset id (synthetic): ${assetId}`);

  const raw = await analyzeVideoWithMiniMax(lesson.videoPath);
  const normalized = normalizeMiniMaxOutput(raw);

  const written = await generateLessonFiles(lesson.slug, normalized);

  console.log('');
  console.log(`✓ Generated ${written.length} files in content/generated/${lesson.slug}/:`);
  for (const f of written) console.log(`  - ${f}`);
  console.log('');
  console.log('Next: open the lesson page or run `npm run analyze:all` for the whole course.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
