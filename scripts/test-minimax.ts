/**
 * Smoke test for the MiniMax + ASR pipeline.
 *
 * Verifies that:
 *   1. callModel() works (text round-trip on the configured model).
 *   2. callModelMultimodal() works (model can see an image we send).
 *   3. transcribeAudio() works (Gemini Flash Lite on a short audio clip).
 *
 * Usage:
 *   npm run test:minimax
 *   # or with explicit env
 *   MINIMAX_API_KEY=sk-or-... npm run test:minimax
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — env not configured
 *   2 — content check failed
 *   3 — transport / parse error
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  callModel,
  callModelMultimodal,
  getMiniMaxConfig,
  isMiniMaxConfigured,
  transcribeAudio,
} from '../lib/ai/minimax';

const FFMPEG =
  process.env.FFMPEG_PATH ??
  'C:/Users/Erica/AppData/Local/Microsoft/WinGet/Packages/yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-N-124716-g054dffd133-win64-gpl/bin/ffmpeg.exe';

function mask(k: string | null): string {
  if (!k) return '(none)';
  if (k.length <= 10) return '***';
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

function makeTestWav(filePath: string, seconds = 3): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      FFMPEG,
      [
        '-y', '-loglevel', 'error',
        '-f', 'lavfi',
        '-i', `sine=frequency=880:duration=${seconds}`,
        '-ar', '16000', '-ac', '1',
        '-codec:a', 'libmp3lame', '-b:a', '32k',
        filePath,
      ],
      { stdio: ['ignore', 'inherit', 'inherit'] },
    );
    proc.on('error', reject);
    proc.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)),
    );
  });
}

async function main() {
  const config = getMiniMaxConfig();
  console.log('─── MiniMax pipeline smoke test ───');
  console.log(`  model:           ${config.model}`);
  console.log(`  transcribeModel: ${config.transcribeModel}`);
  console.log(`  base:            ${config.baseUrl}`);
  console.log(`  key:             ${mask(config.apiKey)}`);
  console.log();

  if (!isMiniMaxConfigured()) {
    console.log('✗ MINIMAX_API_KEY not set.');
    console.log('  Set it in .env (gitignored) or inline:');
    console.log('    MINIMAX_API_KEY=sk-or-... npm run test:minimax');
    process.exit(1);
  }

  // 1. Text round-trip
  console.log('1) callModel() — text round-trip…');
  let textReply: string | null;
  try {
    textReply = await callModel('Rispondi solo con la parola "ciao".', {
      temperature: 0,
      maxTokens: 30,
    });
  } catch (err) {
    console.error('  ✗ call failed:', (err as Error).message);
    process.exit(3);
  }
  if (!textReply) {
    console.error('  ✗ no content');
    process.exit(3);
  }
  console.log(`  ✓ reply: ${JSON.stringify(textReply.slice(0, 80))}`);

  // 2. Multimodal: model sees a small image (red 8x8 PNG)
  console.log();
  console.log('2) callModelMultimodal() — model sees an image…');
  const tinyPng =
    'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGP8z8DwH4iZGNAAFwQDAAhgAhdvdg4VAAAAAElFTkSuQmCC';
  const imgReply = await callModelMultimodal(
    [
      { type: 'text', text: 'Che colore? Una parola.' },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${tinyPng}` } },
    ],
    { temperature: 0, maxTokens: 20 },
  ).catch((e) => {
    console.error('  ✗ call failed:', e.message);
    process.exit(3);
  });
  if (!imgReply) {
    console.error('  ✗ no content');
    process.exit(3);
  }
  console.log(`  ✓ reply: ${JSON.stringify(imgReply.slice(0, 80))}`);
  if (!/ross|red/i.test(imgReply)) {
    console.error('  ✗ model did not identify red');
    process.exit(2);
  }

  // 3. Audio transcription (Gemini Flash Lite)
  console.log();
  console.log('3) transcribeAudio() — Gemini Flash Lite on a 3s test tone…');
  const tmp = path.join(os.tmpdir(), `smoke-${Date.now()}.mp3`);
  try {
    await makeTestWav(tmp, 3);
    const result = await transcribeAudio(tmp, { language: 'it' });
    if (!result) {
      console.error('  ✗ no transcription result');
      process.exit(3);
    }
    console.log(`  ✓ transcript (${result.text.length} chars):`);
    console.log('    ', result.text.slice(0, 120).replace(/\n/g, ' '));
  } catch (err) {
    console.error('  ✗ transcribe failed:', (err as Error).message);
    process.exit(3);
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }

  console.log();
  console.log('All checks passed. ✓');
  process.exit(0);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(3);
});
