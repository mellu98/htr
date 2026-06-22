/**
 * extract-media.ts
 *
 * Extract audio (MP3) and keyframes (JPEG) from a video file using ffmpeg.
 * Outputs go under /content/generated/<slug>/assets/:
 *   - audio.mp3          (mono, 32 kbps, ~14 MB per hour)
 *   - frames/frame_NNN.jpg  (1 every `intervalSec` seconds, max `maxFrames`,
 *                            resized so longest edge ≤ `maxEdge`px)
 *
 * Designed to be cached: re-running is a no-op if the audio and frames
 * are already present and newer than the source video.
 *
 * Usage:
 *   npx tsx scripts/extract-media.ts --video public/videos/foo.mp4 --slug foo
 *   npx tsx scripts/extract-media.ts --video foo.mp4 --slug foo --interval 20 --max 48
 *
 * Exits 0 on success, 1 on ffmpeg error.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const FFMPEG = process.env.FFMPEG_PATH
  ?? 'C:/Users/Erica/AppData/Local/Microsoft/WinGet/Packages/yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-N-124716-g054dffd133-win64-gpl/bin/ffmpeg.exe';

function parseArgs(argv: string[]): {
  video: string;
  slug: string;
  interval: number;
  max: number;
  edge: number;
  force: boolean;
} {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) args[a.slice(2)] = argv[++i] ?? '';
  }
  return {
    video: args.video ?? '',
    slug: args.slug ?? '',
    interval: Number(args.interval ?? 30),
    max: Number(args.max ?? 32),
    edge: Number(args.edge ?? 800),
    force: 'force' in args,
  };
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, ['-y', '-loglevel', 'error', ...args], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

function runFfprobeDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const FFPROBE = FFMPEG.replace(/ffmpeg\.exe$/, 'ffprobe.exe');
    const proc = spawn(
      FFPROBE,
      [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        videoPath,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let out = '';
    proc.stdout.on('data', (c) => (out += c.toString()));
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code !== 0) return reject(new Error(`ffprobe exited ${code}`));
      const sec = Number(out.trim());
      if (!Number.isFinite(sec)) return reject(new Error(`bad ffprobe output: ${out}`));
      resolve(sec);
    });
  });
}

async function main() {
  const { video, slug, interval, max, edge, force } = parseArgs(process.argv.slice(2));
  if (!video || !slug) {
    console.error('Usage: extract-media --video <path> --slug <slug> [--interval 30] [--max 32] [--edge 800] [--force]');
    process.exit(1);
  }
  const videoPath = path.isAbsolute(video) ? video : path.join(process.cwd(), video);
  if (!fs.existsSync(videoPath)) {
    console.error(`Video not found: ${videoPath}`);
    process.exit(1);
  }
  const outDir = path.join(process.cwd(), 'content', 'generated', slug, 'assets');
  const audioPath = path.join(outDir, 'audio.mp3');
  const framesDir = path.join(outDir, 'frames');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const videoMtime = fs.statSync(videoPath).mtimeMs;
  const audioMtime = fs.existsSync(audioPath) ? fs.statSync(audioPath).mtimeMs : 0;
  const audioStale = force || audioMtime < videoMtime;

  // 1. Audio
  if (audioStale) {
    console.log(`▶ Extracting audio → ${audioPath}`);
    await runFfmpeg([
      '-i', videoPath,
      '-vn',
      '-ac', '1',
      '-ar', '16000',
      '-codec:a', 'libmp3lame',
      '-b:a', '32k',
      audioPath,
    ]);
    console.log(`  ✓ ${(fs.statSync(audioPath).size / 1024 / 1024).toFixed(2)} MB`);
  } else {
    console.log(`⤴  Audio cache hit (${(fs.statSync(audioPath).size / 1024 / 1024).toFixed(2)} MB)`);
  }

  // 2. Keyframes
  const existingFrames = fs.existsSync(framesDir)
    ? fs.readdirSync(framesDir).filter((f) => f.endsWith('.jpg'))
    : [];
  const firstFramePath = path.join(framesDir, 'frame_000.jpg');
  const framesStale =
    force ||
    existingFrames.length === 0 ||
    (fs.existsSync(firstFramePath) && fs.statSync(firstFramePath).mtimeMs < videoMtime);

  if (framesStale) {
    console.log(`▶ Extracting keyframes (1 every ${interval}s, max ${max}) → ${framesDir}`);
    // Wipe stale frames first.
    for (const f of existingFrames) fs.unlinkSync(path.join(framesDir, f));

    // Pick a frame interval that yields <= max frames.
    let duration = 0;
    try {
      duration = await runFfprobeDuration(videoPath);
    } catch (err) {
      console.warn('  ⚠ ffprobe failed, falling back to fps filter:', (err as Error).message);
    }
    let effectiveInterval = interval;
    if (duration > 0) {
      const needed = Math.ceil(duration / max);
      if (needed > interval) effectiveInterval = needed;
    }

    await runFfmpeg([
      '-i', videoPath,
      '-vf', `fps=1/${effectiveInterval},scale='if(gt(iw,ih),${edge},-2)':'if(gt(iw,ih),-2,${edge})'`,
      '-q:v', '4', // JPEG quality (lower is better; 2=high, 5=ok, 10=low)
      framesDir + path.sep + 'frame_%03d.jpg',
    ]);
    const frames = fs.readdirSync(framesDir).filter((f) => f.endsWith('.jpg'));
    console.log(`  ✓ ${frames.length} keyframes written`);
  } else {
    console.log(`⤴  Frames cache hit (${existingFrames.length} frames)`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
