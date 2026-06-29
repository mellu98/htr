/**
 * MiniMax adapter.
 *
 * Wires the project to a real model. Two provider modes are supported,
 * picked automatically from env:
 *
 *   - OpenAI-compatible chat-completions (default). Uses `MINIMAX_API_KEY`
 *     against `https://openrouter.ai/api/v1` (OpenRouter hosts the
 *     multimodal M3 and also lets us hit Gemini for ASR via OpenRouter).
 *
 *   - Anthropic-compatible messages API (fallback). When `MINIMAX_API_KEY`
 *     is unset but `ANTHROPIC_AUTH_TOKEN` is present, we POST to
 *     `${ANTHROPIC_BASE_URL}/v1/messages` with the Anthropic body shape
 *     (top-level `system`, `x-api-key` header, `anthropic-version` header).
 *     This lets the chat route talk to a hosted M3 endpoint that speaks the
 *     Anthropic API without changing callers.
 *
 * Pipeline for a real video:
 *   1. ffmpeg locally extracts audio (MP3 32 kbps mono) + N keyframes (JPEG)
 *      into /content/generated/<slug>/assets/. Cached — re-runs are no-ops.
 *   2. transcribeAudio() sends the MP3 to the transcribe model (default
 *      Gemini Flash Lite, OpenRouter-only) and returns the verbatim Italian
 *      transcript.
 *   3. analyzeVideoWithMiniMax() sends the transcript + a structured prompt
 *      to a text-only analysis model (default Claude 3.5 Sonnet via
 *      OpenRouter) and parses the JSON response into the lesson artifact
 *      set the rest of the app expects.
 *
 * Behavior with no API key:
 *   - All functions return deterministic mock output. The script pipeline
 *     and AI Tutor keep working offline. The "open-source, no-key-needed"
 *     default is preserved.
 *
 * Required env vars (with defaults):
 *   Provider: openai-compatible (preferred)
 *     MINIMAX_API_KEY          — required for any real call
 *     MINIMAX_BASE_URL         — default: https://openrouter.ai/api/v1
 *     MINIMAX_MODEL            — default: minimax/minimax-m3
 *     MINIMAX_TRANSCRIBE_MODEL — default: google/gemini-2.5-flash-lite
 *
 *   Provider: anthropic (fallback when MINIMAX_API_KEY is unset)
 *     ANTHROPIC_AUTH_TOKEN              — required
 *     ANTHROPIC_BASE_URL                — default: https://api.minimax.io/anthropic
 *     ANTHROPIC_MODEL                   — default: ANTHROPIC_DEFAULT_SONNET_MODEL or "MiniMax-M3"
 *     ANTHROPIC_DEFAULT_SONNET_MODEL    — used as fallback for ANTHROPIC_MODEL
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { URL } from 'node:url';
import courseJson from '@/content/course.json';
import type {
  ChecklistItem,
  Flashcard,
  ImportantMoment,
  LessonAnalysis,
  QuizQuestion,
  VisualElement,
} from '@/lib/types';

const course = courseJson as typeof courseJson;

const FFMPEG =
  process.env.FFMPEG_PATH ??
  'C:/Users/Erica/AppData/Local/Microsoft/WinGet/Packages/yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-N-124716-g054dffd133-win64-gpl/bin/ffmpeg.exe';

export interface MiniMaxConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string | null;
  model: string;
  baseUrl: string;
  transcribeModel: string;
}

const DEFAULT_OPENAI_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_OPENAI_MODEL = 'anthropic/claude-3.5-sonnet';
const DEFAULT_TRANSCRIBE_MODEL = 'google/gemini-2.5-flash-lite';

const DEFAULT_ANTHROPIC_BASE_URL =
  process.env.ANTHROPIC_BASE_URL?.trim() || 'https://api.minimax.io/anthropic';
const DEFAULT_ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() ||
  process.env.ANTHROPIC_DEFAULT_SONNET_MODEL?.trim() ||
  'MiniMax-M3';
const ANTHROPIC_API_VERSION =
  process.env.ANTHROPIC_VERSION?.trim() || '2023-06-01';

export function getMiniMaxConfig(): MiniMaxConfig {
  const openaiKey = process.env.MINIMAX_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_AUTH_TOKEN?.trim();

  if (openaiKey) {
    return {
      provider: 'openai',
      apiKey: openaiKey,
      model: process.env.MINIMAX_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
      baseUrl: (
        process.env.MINIMAX_BASE_URL?.trim() || DEFAULT_OPENAI_BASE_URL
      ).replace(/\/+$/, ''),
      transcribeModel:
        process.env.MINIMAX_TRANSCRIBE_MODEL?.trim() ||
        DEFAULT_TRANSCRIBE_MODEL,
    };
  }

  if (anthropicKey) {
    return {
      provider: 'anthropic',
      apiKey: anthropicKey,
      model: DEFAULT_ANTHROPIC_MODEL,
      baseUrl: DEFAULT_ANTHROPIC_BASE_URL.replace(/\/+$/, ''),
      // Transcribe model is OpenRouter-only; keep a sensible default but
      // transcribeAudio() will fail loudly on the Anthropic provider.
      transcribeModel:
        process.env.MINIMAX_TRANSCRIBE_MODEL?.trim() ||
        DEFAULT_TRANSCRIBE_MODEL,
    };
  }

  return {
    provider: 'openai',
    apiKey: null,
    model: DEFAULT_OPENAI_MODEL,
    baseUrl: DEFAULT_OPENAI_BASE_URL.replace(/\/+$/, ''),
    transcribeModel: DEFAULT_TRANSCRIBE_MODEL,
  };
}

export function isMiniMaxConfigured(): boolean {
  const { apiKey } = getMiniMaxConfig();
  return Boolean(apiKey && apiKey.length > 0);
}

/** Mask an API key for safe logging (first 4 + … + last 4). */
function maskKey(k: string | null): string {
  if (!k) return '(none)';
  if (k.length <= 10) return '***';
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

/**
 * Some models (including reasoning-tuned ones) prefix replies with a
 * `<think>...</think>` chain-of-thought block. We strip that here so
 * downstream code (and JSON parsers) see only the actual answer.
 *
 * Also handles a stray code-fence wrapper around JSON (` ```json ... ``` `)
 * in case the model falls back to markdown despite response_format.
 */
export function stripThinkingAndFences(text: string): string {
  let out = text;
  out = out.replace(/<think>[\s\S]*?<\/think>/gi, '');
  const fence = /^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/i.exec(out);
  if (fence) out = fence[1];
  return out.trim();
}

/**
 * Extract a JSON object from a model reply. Handles:
 *   - code fences stripped by stripThinkingAndFences
 *   - JSON embedded inside explanatory text (uses first `{` and last `}`)
 *   - trailing model text after the JSON
 *
 * Throws if no valid JSON object can be parsed.
 */
export function extractJson(text: string): unknown {
  const cleaned = stripThinkingAndFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    // fall through
  }

  // The whole response isn't a single fenced block; look for a ```json block
  // anywhere in the text.
  const jsonFence = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(cleaned);
  if (jsonFence) {
    try {
      return JSON.parse(jsonFence[1].trim());
    } catch {
      // fall through
    }
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error('No JSON object found in response');
  }
  const candidate = cleaned.slice(firstBrace, lastBrace + 1);
  return JSON.parse(candidate);
}

export class MiniMaxApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, statusText: string, body: string) {
    super(`[minimax] ${status} ${statusText}: ${body.slice(0, 500)}`);
    this.name = 'MiniMaxApiError';
    this.status = status;
    this.body = body;
  }
}

// ---------------------------------------------------------------------------
// Core chat-completions call (text-only and multimodal content arrays).
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<Record<string, unknown>>;
}

/** Escape characters that are unsafe inside a data URL. */
function fsSafeBase64(buf: Buffer): string {
  return buf.toString('base64');
}

/** Read a file as a base64 data URL with the right MIME type. */
function dataUrlFromFile(filePath: string, mime: string): string {
  const buf = fs.readFileSync(filePath);
  return `data:${mime};base64,${fsSafeBase64(buf)}`;
}

/**
 * Low-level POST. Dispatches to the right provider based on the resolved
 * config. Returns the assistant message text. Throws MiniMaxApiError on
 * non-2xx, or a plain Error on shape mismatches.
 */
export async function postChat(
  messages: ChatMessage[],
  opts?: {
    model?: string;
    json?: boolean;
    temperature?: number;
    maxTokens?: number;
    extraBody?: Record<string, unknown>;
  },
): Promise<string> {
  const config = getMiniMaxConfig();
  if (!config.apiKey) {
    throw new Error('[minimax] no API key configured');
  }
  // The Anthropic messages API does not support OpenAI's
  // `response_format: { type: 'json_object' }` contract. JSON forcing on
  // Anthropic is supposed to be done via prompt engineering or tool use.
  // We fail loudly here instead of silently returning free-form text that
  // would break callers expecting parseable JSON (e.g. analyzeVideoWithMiniMax).
  if (opts?.json && config.provider === 'anthropic') {
    throw new Error(
      "[minimax] opts.json=true is not supported on the Anthropic provider. " +
        'Use OpenRouter (set MINIMAX_API_KEY) or remove the json flag.',
    );
  }
  if (config.provider === 'anthropic') {
    return postChatAnthropic(messages, opts, config);
  }
  return postChatOpenAI(messages, opts, config);
}

/**
 * OpenAI-compatible chat-completions POST. Used for OpenRouter (default)
 * and any other `messages[].role/content` endpoint.
 */
async function postChatOpenAI(
  messages: ChatMessage[],
  opts: {
    model?: string;
    json?: boolean;
    temperature?: number;
    maxTokens?: number;
    extraBody?: Record<string, unknown>;
  } | undefined,
  config: MiniMaxConfig,
): Promise<string> {
  const url = `${config.baseUrl}/chat/completions`;
  const body: Record<string, unknown> = {
    model: opts?.model ?? config.model,
    messages,
    temperature: opts?.temperature ?? 0.7,
  };
  if (opts?.json) body.response_format = { type: 'json_object' };
  if (opts?.maxTokens != null) body.max_tokens = opts.maxTokens;
  if (opts?.extraBody) Object.assign(body, opts.extraBody);

  // Use Node's http/https modules directly. Node 24's native fetch (undici)
  // is unreliable for very large JSON bodies (audio base64 ≈ 12 MB+) — the
  // underlying socket dies with a bare "fetch failed" error. The legacy
  // request path works fine and is well-tested.
  const result = await httpPostJson(url, body, {
    Authorization: `Bearer ${config.apiKey}`,
  });

  if (result.status < 200 || result.status >= 300) {
    throw new MiniMaxApiError(result.status, result.statusText, result.text);
  }

  let data: { choices?: Array<{ message?: { content?: unknown } }> };
  try {
    data = JSON.parse(result.text);
  } catch (err) {
    throw new Error(
      `[minimax] non-JSON response (status ${result.status}): ${result.text.slice(0, 500)}`,
    );
  }
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error(
      `[minimax] unexpected response shape: ${JSON.stringify(data).slice(0, 500)}`,
    );
  }
  return stripThinkingAndFences(content);
}

/**
 * Anthropic-compatible messages POST.
 *
 * - `system` is hoisted out of `messages` into a top-level field (Anthropic
 *   requires it; multiple system messages are joined with two newlines).
 * - Auth header is `x-api-key` plus `anthropic-version`.
 * - `max_tokens` is required by the Anthropic API; if the caller didn't
 *   specify one, we default to 4096 for text replies and 8000 for the
 *   multimodal video analysis path (which uses callModelMultimodal).
 * - Response body uses `content: [{type: 'text', text: '...'}]`. Non-text
 *   blocks (e.g. `tool_use`, `thinking`) are skipped.
 */
async function postChatAnthropic(
  messages: ChatMessage[],
  opts: {
    model?: string;
    json?: boolean;
    temperature?: number;
    maxTokens?: number;
    extraBody?: Record<string, unknown>;
  } | undefined,
  config: MiniMaxConfig,
): Promise<string> {
  const url = `${config.baseUrl}/v1/messages`;

  let systemText = '';
  const userTurns: Array<{ role: 'user' | 'assistant'; content: unknown }> = [];
  for (const m of messages) {
    if (m.role === 'system') {
      systemText += (systemText ? '\n\n' : '') + String(m.content);
      continue;
    }
    if (typeof m.content === 'string') {
      userTurns.push({ role: m.role, content: m.content });
    } else {
      userTurns.push({ role: m.role, content: m.content });
    }
  }

  const body: Record<string, unknown> = {
    model: opts?.model ?? config.model,
    messages: userTurns,
    max_tokens: opts?.maxTokens ?? 4096,
  };
  if (systemText) body.system = systemText;
  if (opts?.temperature != null) body.temperature = opts.temperature;
  if (opts?.extraBody) Object.assign(body, opts.extraBody);

  const result = await httpPostJson(url, body, {
    'x-api-key': config.apiKey ?? '',
    'anthropic-version': ANTHROPIC_API_VERSION,
  });

  if (result.status < 200 || result.status >= 300) {
    throw new MiniMaxApiError(result.status, result.statusText, result.text);
  }

  let data: {
    content?: Array<{ type?: string; text?: string }>;
    error?: { message?: string };
  };
  try {
    data = JSON.parse(result.text);
  } catch {
    throw new Error(
      `[minimax] non-JSON response (status ${result.status}): ${result.text.slice(0, 500)}`,
    );
  }
  if (data.error?.message) {
    throw new Error(`[minimax] ${data.error.message}`);
  }
  const text = (data.content ?? [])
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text as string)
    .join('');
  if (!text) {
    throw new Error(
      `[minimax] unexpected Anthropic response shape: ${result.text.slice(0, 500)}`,
    );
  }
  return stripThinkingAndFences(text);
}

/**
 * Shared HTTP POST helper used by both provider branches. Uses Node's
 * http/https modules directly because Node 24's native fetch (undici) is
 * unreliable for very large JSON bodies (audio base64 ≈ 12 MB+).
 */
async function httpPostJson(
  url: string,
  body: Record<string, unknown>,
  extraHeaders: Record<string, string>,
): Promise<{ status: number; statusText: string; text: string }> {
  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === 'https:';
  const lib = isHttps ? https : http;
  const bodyStr = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        method: 'POST',
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr, 'utf8'),
          ...extraHeaders,
        },
        timeout: 10 * 60 * 1000, // 10 minutes — covers long transcriptions
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({
            status: res.statusCode ?? 0,
            statusText: res.statusMessage ?? '',
            text,
          });
        });
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('[minimax] request timed out after 10 minutes'));
    });
    req.write(bodyStr);
    req.end();
  });
}

/**
 * Text-only chat call. Returns null when no key is configured (so callers
 * can fall back to mock without a try/catch). Throws on any other error.
 */
export async function callModel(
  prompt: string,
  opts?: { json?: boolean; system?: string; temperature?: number; maxTokens?: number },
): Promise<string | null> {
  if (!isMiniMaxConfigured()) return null;
  const messages: ChatMessage[] = [];
  if (opts?.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: prompt });
  return postChat(messages, {
    json: opts?.json,
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
  });
}

/**
 * Multimodal chat call. `content` is an array of content parts:
 *   { type: 'text', text: '...' }
 *   { type: 'image_url', image_url: { url: 'data:image/...' | 'https://...' } }
 *   { type: 'file', file: { filename, file_data: 'data:...' } }   ← Gemini-style
 *
 * Returns null when no key is configured.
 */
export async function callModelMultimodal(
  content: Array<Record<string, unknown>>,
  opts?: {
    model?: string;
    json?: boolean;
    system?: string;
    temperature?: number;
    maxTokens?: number;
  },
): Promise<string | null> {
  if (!isMiniMaxConfigured()) return null;
  const messages: ChatMessage[] = [];
  if (opts?.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content });
  return postChat(messages, {
    model: opts?.model,
    json: opts?.json,
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
  });
}

// ---------------------------------------------------------------------------
// Audio transcription (defaults to Gemini Flash Lite via OpenRouter).
// ---------------------------------------------------------------------------

export interface TranscriptionResult {
  text: string;
  raw: unknown;
}

/**
 * Transcribe an audio file (MP3/WAV/M4A) using the configured transcribe
 * model. We send the audio as a `file` content part (Gemini-style), which
 * OpenRouter accepts. We ask for a verbatim transcript in Italian with
 * `[MM:SS]` segment markers.
 *
 * Returns null when no key is configured.
 */
export async function transcribeAudio(
  audioPath: string,
  opts?: { language?: string; model?: string },
): Promise<TranscriptionResult | null> {
  if (!isMiniMaxConfigured()) return null;
  if (!fs.existsSync(audioPath)) {
    throw new Error(`[transcribe] audio file not found: ${audioPath}`);
  }

  const config = getMiniMaxConfig();
  const ext = path.extname(audioPath).slice(1).toLowerCase() || 'mp3';
  const mime = ext === 'mp3' ? 'audio/mpeg' : ext === 'wav' ? 'audio/wav' : `audio/${ext}`;
  const dataUrl = dataUrlFromFile(audioPath, mime);
  const language = opts?.language ?? 'it';

  const instruction =
    `Trascrivi il file audio in italiano (it-IT) in modo VERBATIM parola per parola. ` +
    `Se il file è in un'altra lingua, trascrivi in quella lingua ma rispondi in italiano solo per i metadati. ` +
    `Restituisci ESCLUSIVAMENTE un JSON valido:\n` +
    `{\n` +
    `  "language": "<ISO 639-1 della lingua parlata nell'audio>",\n` +
    `  "durationSeconds": <numero intero stimato>,\n` +
    `  "segments": [{ "start": "MM:SS", "end": "MM:SS", "text": "trascrizione del segmento" }],\n` +
    `  "fullText": "trascrizione completa unita, con [MM:SS] markers prima di ogni cambio di argomento principale"\n` +
    `}\n` +
    `Nessun testo fuori dal JSON. Nessun commento.`;

  const content = [
    { type: 'text', text: instruction },
    {
      type: 'file',
      file: { filename: path.basename(audioPath), file_data: dataUrl },
    },
  ];

  const raw = await postChat(
    [{ role: 'user', content }],
    {
      model: opts?.model ?? config.transcribeModel,
      json: true,
      temperature: 0.1,
      maxTokens: 64000,
    },
  );

  interface TranscriptionJson {
    language?: string;
    durationSeconds?: number;
    segments?: Array<{ start?: string; end?: string; text?: string }>;
    fullText?: string;
  }

  let parsed: TranscriptionJson | null = null;
  try {
    parsed = extractJson(raw) as TranscriptionJson;
  } catch {
    parsed = null;
  }

  let md = '';
  if (parsed && Array.isArray(parsed.segments)) {
    for (const seg of parsed.segments) {
      const start = seg.start ?? '00:00';
      const text = seg.text ?? '';
      md += `[${start}] ${text}\n\n`;
    }
  } else if (parsed?.fullText) {
    md = parsed.fullText;
  } else {
    md = raw;
  }
  return { text: md.trim(), raw };
}

// ---------------------------------------------------------------------------
// ffmpeg helpers (audio + keyframes extraction with caching).
// ---------------------------------------------------------------------------

interface MediaAssets {
  audioPath: string;
  framesDir: string;
  framePaths: string[];
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

export interface ExtractOpts {
  intervalSec?: number; // default 30
  maxFrames?: number; // default 32
  maxEdgePx?: number; // default 800
  force?: boolean;
}

/**
 * Ensure /content/generated/<slug>/assets/audio.mp3 and frames/ exist.
 * Returns the absolute paths. Re-runs are no-ops if the assets are newer
 * than the source video.
 */
export async function extractMediaAssets(
  videoPath: string,
  slug: string,
  opts: ExtractOpts = {},
): Promise<MediaAssets> {
  const absVideo = path.isAbsolute(videoPath)
    ? videoPath
    : path.join(process.cwd(), videoPath);
  if (!fs.existsSync(absVideo)) {
    throw new Error(`[extract] video not found: ${absVideo}`);
  }
  const interval = opts.intervalSec ?? 30;
  const maxFrames = opts.maxFrames ?? 32;
  const maxEdge = opts.maxEdgePx ?? 800;
  const force = opts.force ?? false;

  const outDir = path.join(process.cwd(), 'content', 'generated', slug, 'assets');
  const audioPath = path.join(outDir, 'audio.mp3');
  const framesDir = path.join(outDir, 'frames');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const videoMtime = fs.statSync(absVideo).mtimeMs;
  const audioMtime = fs.existsSync(audioPath) ? fs.statSync(audioPath).mtimeMs : 0;

  // 1. Audio (only if stale or forced).
  if (force || audioMtime < videoMtime) {
    console.log(`[extract] → audio ${audioPath}`);
    await runFfmpeg([
      '-i', absVideo,
      '-vn', '-ac', '1', '-ar', '16000',
      '-codec:a', 'libmp3lame', '-b:a', '32k',
      audioPath,
    ]);
  } else {
    console.log(`[extract] audio cached (${(fs.statSync(audioPath).size / 1024 / 1024).toFixed(1)} MB)`);
  }

  // 2. Frames (only if stale or forced).
  const existing = fs
    .readdirSync(framesDir)
    .filter((f) => f.endsWith('.jpg'))
    .sort();
  const firstFrame = path.join(framesDir, existing[0] ?? 'frame_000.jpg');
  const framesStale =
    force ||
    existing.length === 0 ||
    (fs.existsSync(firstFrame) && fs.statSync(firstFrame).mtimeMs < videoMtime);

  if (framesStale) {
    console.log(`[extract] → frames (1/${interval}s, max ${maxFrames}) ${framesDir}`);
    for (const f of existing) fs.unlinkSync(path.join(framesDir, f));

    let effectiveInterval = interval;
    try {
      const dur = await runFfprobeDuration(absVideo);
      const needed = Math.ceil(dur / maxFrames);
      if (needed > interval) effectiveInterval = needed;
    } catch {
      // ignore — fall back to requested interval
    }

    await runFfmpeg([
      '-i', absVideo,
      '-vf',
      `fps=1/${effectiveInterval},scale='if(gt(iw,ih),${maxEdge},-2)':'if(gt(iw,ih),-2,${maxEdge})'`,
      '-q:v', '4',
      framesDir + path.sep + 'frame_%03d.jpg',
    ]);
  } else {
    console.log(`[extract] frames cached (${existing.length} frames)`);
  }

  const framePaths = fs
    .readdirSync(framesDir)
    .filter((f) => f.endsWith('.jpg'))
    .sort()
    .map((f) => path.join(framesDir, f));

  return { audioPath, framesDir, framePaths };
}

// ---------------------------------------------------------------------------
// Public adapter functions.
// ---------------------------------------------------------------------------

/**
 * Backwards-compatible "upload" hook. Now it's a local no-op: media
 * extraction happens on disk, then we send to the model as base64. Kept
 * so existing callers (scripts/analyze-video.ts, scripts/analyze-all.ts)
 * still compile.
 */
export async function uploadVideoToMiniMax(videoPath: string): Promise<string> {
  const id = `local-${path.basename(videoPath)}`;
  console.log(`[minimax] (local) assets extracted for ${videoPath} → ${id}`);
  return id;
}

/**
 * The real "top" pipeline.
 *
 * 1. Ensure audio + keyframes exist (ffmpeg, cached).
 * 2. Transcribe audio verbatim in Italian (Gemini Flash Lite).
 * 3. Build a multimodal prompt (text + 32 keyframes) for M3 with the
 *    transcript as context. M3 returns structured JSON for the lesson.
 * 4. Normalize into the artifact set the rest of the app expects.
 *
 * Falls back to the deterministic mock ONLY if no API key is configured
 * (so the dev experience without a key still works). On any real error
 * during a real call, the error is thrown — the user explicitly wants
 * the model to actually see the video, so silent degradation is worse
 * than a loud failure.
 */
export async function analyzeVideoWithMiniMax(
  videoPath: string,
): Promise<RawModelOutput> {
  if (!isMiniMaxConfigured()) {
    console.log(
      `[minimax] No API key set — generating mock output for ${videoPath}.`,
    );
    return buildMockOutputFromVideo(videoPath);
  }

  const filename = path.basename(videoPath);
  const lesson = course.lessons.find((l) => l.videoPath.endsWith(filename));
  const slug = lesson?.slug ?? 'unknown';
  const lessonTitle = lesson?.title ?? filename;
  const moduleTitle = lesson
    ? (course.modules.find((m) => m.id === lesson.moduleId)?.title ?? '')
    : '';

  // 1. Ensure media assets (ffmpeg). The caller may pass either an
  // absolute filesystem path or a public-URL-relative path
  // (e.g. `/videos/foo.mp4` from `course.json`).
  const absVideo = fs.existsSync(videoPath)
    ? videoPath
    : path.join(process.cwd(), 'public', videoPath.replace(/^\/+/, ''));
  const assets = await extractMediaAssets(absVideo, slug, { maxFrames: 16, maxEdgePx: 512 });

  // 2. Transcribe audio.
  console.log(`[minimax] transcribing audio for ${slug}…`);
  const transcription = await transcribeAudio(assets.audioPath);
  if (!transcription) {
    // No key — handled at the top, but TS narrowing.
    return buildMockOutputFromVideo(videoPath);
  }
  console.log(
    `[minimax] transcript ready: ${transcription.text.length} chars`,
  );

  // 3. Build text-only prompt and call the analysis model.
  // We no longer send video frames: MiniMax M3 repeatedly failed on long
  // videos. Claude 3.5 Sonnet on OpenRouter analyzes the verbatim transcript
  // and produces the same structured output reliably.
  const config = getMiniMaxConfig();
  console.log(
    `[minimax] calling ${config.model} with transcript (${transcription.text.length} chars)…`,
  );

  const textPrompt = buildTextAnalysisPrompt(slug, lessonTitle, moduleTitle, transcription.text);

  const raw = await callModel(textPrompt, {
    json: false,
    temperature: 0.4,
    maxTokens: 24000,
    system:
      'Sei un coach didattico per il corso HTR Training. Rispondi solo con JSON valido che rispetti lo schema richiesto. ' +
      'Non inventare contenuti: usa solo ciò che leggi nel transcript fornito. ' +
      'Per i visualElements e visualNotes, inferisci i tipi di slide/whiteboard tipici di una lezione del genere, ma resta generico e prudente.',
  });
  if (!raw) {
    return buildMockOutputFromVideo(videoPath);
  }

  let parsed: RawModelOutput;
  try {
    parsed = extractJson(raw) as RawModelOutput;
  } catch (err) {
    throw new Error(
      `[minimax] ${config.model} returned non-JSON for ${slug}: ${(err as Error).message}\n--- body ---\n${raw.slice(0, 800)}`,
    );
  }

  // Force the transcript from ASR (it's verbatim) regardless of what the
  // model said — the transcript is the source of truth.
  parsed.transcript = transcription.text;
  if (!parsed.analysis) {
    parsed.analysis = {
      lessonSlug: slug,
      mainTopics: [],
      visualElements: [],
      importantMoments: [],
      practicalOutput: '',
      difficulty: 'intermediate',
      recommendedNextAction: '',
      managerNotes: '',
    };
  }
  return parsed;
}

function buildAnalysisPrompt(
  slug: string,
  lessonTitle: string,
  moduleTitle: string,
  transcript: string,
): string {
  return `Sei un coach didattico per il corso HTR Training (music business per artisti italiani).

Stai analizzando la lezione intitolata "${lessonTitle}" del modulo "${moduleTitle}".

Qui sotto trovi:
1. Il transcript VERBATIM dell'audio (fonte primaria di verità).
2. ${'{N}'} keyframe del video in ordine temporale (le immagini dopo questo prompt).
3. Lo schema JSON esatto che devi restituire.

TRANSCRIPT:
\`\`\`
${transcript.slice(0, 12000)}${transcript.length > 12000 ? '\n[...truncated...]' : ''}
\`\`\`

Devi produrre ESCLUSIVAMENTE un JSON valido (nessun testo prima o dopo) con questo schema:

{
  "transcript": "(stringa markdown con trascrizione verbatim, già presente sopra — lasciala IDENTICA)",
  "visualNotes": "(stringa markdown che descrive cosa si vede nei frame: slide, whiteboard, schermo, foto, grafici, performance)",
  "summary": "(stringa markdown con 'Key takeaways' (5 bullet), 'Why it matters', 'What to do next')",
  "actionPlan": "(stringa markdown con sezioni 'Entro 24 ore', 'Entro la settimana', 'Entro il mese', 2-3 bullet ciascuna)",
  "checklist": [{ "id": "check-1", "title": "...", "description": "...", "completed": false }] (3-5 elementi),
  "quiz": [{ "id": "q1", "question": "...", "options": ["a","b","c","d"], "correctAnswer": "una delle options esatta", "explanation": "..." }] (3 domande),
  "flashcards": [{ "id": "f1", "front": "...", "back": "...", "difficulty": "easy|medium|hard" }] (4 elementi),
  "analysis": {
    "lessonSlug": "${slug}",
    "mainTopics": ["..."],
    "visualElements": [{ "type": "slide|whiteboard|photo|diagram|screen|performance", "description": "..." }],
    "importantMoments": [{ "timestamp": "MM:SS", "title": "...", "why": "..." }],
    "practicalOutput": "deliverable concreto che lo studente produce",
    "difficulty": "beginner|intermediate|advanced",
    "recommendedNextAction": "azione specifica per la prossima settimana",
    "managerNotes": "cosa deve verificare un manager"
  }
}

Vincoli:
- Tutti i testi in italiano, tono professionale e diretto.
- Le domande del quiz devono avere UNA sola risposta corretta presente testualmente nelle options.
- I timestamp di importantMoments in formato MM:SS, basati sui segmenti del transcript.
- Basa le risposte SOLO sul transcript fornito. Non inventare.`;
}

function buildTextAnalysisPrompt(
  slug: string,
  lessonTitle: string,
  moduleTitle: string,
  transcript: string,
): string {
  return `Sei un coach didattico per il corso HTR Training (music business per artisti italiani).

Stai analizzando la lezione intitolata "${lessonTitle}" del modulo "${moduleTitle}".

Hai a disposizione SOLO il transcript VERBATIM dell'audio (fonte primaria di verità). Non ci sono frame video.

TRANSCRIPT:
\`\`\`
${transcript.slice(0, 15000)}${transcript.length > 15000 ? '\n[...truncated...]' : ''}
\`\`\`

Devi produrre ESCLUSIVAMENTE un JSON valido (nessun testo prima o dopo) con questo schema.
NOTA: NON ripetere il transcript nel JSON; lo script lo inserisce automaticamente. Restituisci solo i campi strutturati sottostanti.

{
  "visualNotes": "(stringa markdown che descrive i tipi di slide/whiteboard/schermo che tipicamente compaiono in una lezione del genere; resta generico)",
  "summary": "(stringa markdown con 'Key takeaways' (5 bullet), 'Why it matters', 'What to do next')",
  "actionPlan": "(stringa markdown con sezioni 'Entro 24 ore', 'Entro la settimana', 'Entro il mese', 2-3 bullet ciascuna)",
  "checklist": [{ "id": "check-1", "title": "...", "description": "...", "completed": false }] (3-5 elementi),
  "quiz": [{ "id": "q1", "question": "...", "options": ["a","b","c","d"], "correctAnswer": "una delle options esatta", "explanation": "..." }] (3 domande),
  "flashcards": [{ "id": "f1", "front": "...", "back": "...", "difficulty": "easy|medium|hard" }] (4 elementi),
  "analysis": {
    "lessonSlug": "${slug}",
    "mainTopics": ["..."],
    "visualElements": [{ "type": "slide|whiteboard|photo|diagram|screen|performance", "description": "..." }],
    "importantMoments": [{ "timestamp": "MM:SS", "title": "...", "why": "..." }],
    "practicalOutput": "deliverable concreto che lo studente produce",
    "difficulty": "beginner|intermediate|advanced",
    "recommendedNextAction": "azione specifica per la prossima settimana",
    "managerNotes": "cosa deve verificare un manager"
  }
}

Vincoli:
- Tutti i testi in italiano, tono professionale e diretto.
- Le domande del quiz devono avere UNA sola risposta corretta presente testualmente nelle options.
- I timestamp di importantMoments in formato MM:SS, basati sui segmenti del transcript.
- Basa le risposte SOLO sul transcript fornito. Non inventare.`;
}

// ---------------------------------------------------------------------------
// Output shapes
// ---------------------------------------------------------------------------

export interface RawModelOutput {
  transcript?: string;
  visualNotes?: string;
  summary?: string;
  actionPlan?: string;
  checklist?: ChecklistItem[];
  quiz?: QuizQuestion[];
  flashcards?: Flashcard[];
  analysis?: LessonAnalysis | null;
}

export interface NormalizedLessonOutput {
  transcript: string;
  visualNotes: string;
  summary: string;
  actionPlan: string;
  checklist: ChecklistItem[];
  quiz: QuizQuestion[];
  flashcards: Flashcard[];
  analysis: LessonAnalysis | null;
}

function normalizeString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value == null) return '';
  if (Array.isArray(value)) return value.join('\n').trim();
  return String(value).trim();
}

export function normalizeMiniMaxOutput(raw: RawModelOutput): NormalizedLessonOutput {
  return {
    transcript: normalizeString(raw.transcript),
    visualNotes: normalizeString(raw.visualNotes),
    summary: normalizeString(raw.summary),
    actionPlan: normalizeString(raw.actionPlan),
    checklist: Array.isArray(raw.checklist) ? raw.checklist : [],
    quiz: Array.isArray(raw.quiz) ? raw.quiz : [],
    flashcards: Array.isArray(raw.flashcards) ? raw.flashcards : [],
    analysis: raw.analysis ?? null,
  };
}

// ---------------------------------------------------------------------------
// Mock generation (only used when no API key is set).
// ---------------------------------------------------------------------------

function deterministicSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function bullet(text: string) {
  return `- ${text}`;
}

function buildMockOutputFromVideo(videoPath: string): RawModelOutput {
  const filename = path.basename(videoPath);
  const lesson = course.lessons.find((l) => l.videoPath.endsWith(filename));
  const slug = lesson?.slug ?? 'unknown-lesson';
  const title = lesson?.title ?? 'Untitled lesson';
  const seed = deterministicSeed(slug);

  const transcript = `# Transcript — ${title}\n\n[00:00] (mock) Welcome and overview.\n[02:30] (mock) Topic 1.\n[08:10] (mock) Topic 2.\n[14:45] (mock) Topic 3.\n[21:30] (mock) Topic 4.\n[27:55] (mock) Closing.\n`;
  const visualNotes = `# Visual Notes — ${title}\n\n- Slide deck with branded title card.\n- Whiteboard section.\n- Case study frame.\n- Recap card with takeaways.\n`;
  const summary = `# Summary — ${title}\n\n## Key takeaways\n${bullet('Takeaway 1.')}\n${bullet('Takeaway 2.')}\n${bullet('Takeaway 3.')}\n\n## Why it matters\nMock.\n\n## What to do next\nPick one action this week.\n`;
  const checklist: ChecklistItem[] = [
    { id: 'check-1', title: 'Definisci il posizionamento', description: 'Scrivi una dichiarazione in una frase.', completed: false },
    { id: 'check-2', title: 'Identifica i segmenti di pubblico', description: 'Core fan, nuovi, industry.', completed: false },
    { id: 'check-3', title: 'Fai l\'audit degli asset', description: 'Keep / refine / kill.', completed: false },
  ];
  const quiz: QuizQuestion[] = [
    {
      id: 'q1',
      question: `Qual è il primo passo in "${title}"?`,
      options: ['Cambiare il logo', 'Definire il posizionamento', 'Aumentare i follower', 'Pubblicare di più'],
      correctAnswer: 'Definire il posizionamento',
      explanation: 'Mock explanation.',
    },
  ];
  const flashcards: Flashcard[] = [
    { id: 'f1', front: 'Cos\'è il posizionamento?', back: 'La frase che spiega perché esisti.', difficulty: 'easy' },
    { id: 'f2', front: 'Tre segmenti', back: 'Core fan, nuovi, industry.', difficulty: 'easy' },
  ];
  const visualElements: VisualElement[] = [
    { type: 'slide', description: 'Title card.' },
    { type: 'whiteboard', description: 'Positioning matrix.' },
  ];
  const importantMoments: ImportantMoment[] = [
    { timestamp: '02:30', title: 'Definizione operativa', why: 'Ancora il vocabolario.' },
  ];
  const analysis: LessonAnalysis = {
    lessonSlug: slug,
    mainTopics: ['Posizionamento', 'Segmentazione', 'Audit', 'Framework'],
    visualElements,
    importantMoments,
    practicalOutput: 'Una dichiarazione scritta e un audit.',
    difficulty: 'intermediate',
    recommendedNextAction: 'Scrivi oggi la bozza.',
    managerNotes: 'Verifica azionabilità.',
  };
  const actionPlan = `# Action Plan — ${title}\n\n## Entro 24 ore\n${bullet('Scrivi la bozza.')}\n\n## Entro la settimana\n${bullet('Audit degli asset.')}\n\n## Entro il mese\n${bullet('Documenta il framework.')}\n`;

  return {
    transcript,
    visualNotes,
    summary,
    actionPlan,
    checklist,
    quiz,
    flashcards,
    analysis,
  };
}

// ---------------------------------------------------------------------------
// generateLessonFiles — write the normalized output to disk.
// ---------------------------------------------------------------------------

export async function generateLessonFiles(
  slug: string,
  output: NormalizedLessonOutput,
): Promise<string[]> {
  const lessonDir = path.join(process.cwd(), 'content', 'generated', slug);
  fs.mkdirSync(lessonDir, { recursive: true });
  const written: string[] = [];
  function writeFile(filename: string, content: string) {
    const fullPath = path.join(lessonDir, filename);
    fs.writeFileSync(fullPath, content, 'utf8');
    written.push(path.relative(process.cwd(), fullPath));
  }
  writeFile('transcript.md', output.transcript);
  writeFile('visual-notes.md', output.visualNotes);
  writeFile('summary.md', output.summary);
  writeFile('action-plan.md', output.actionPlan);
  writeFile('checklist.json', JSON.stringify(output.checklist, null, 2));
  writeFile('quiz.json', JSON.stringify(output.quiz, null, 2));
  writeFile('flashcards.json', JSON.stringify(output.flashcards, null, 2));
  writeFile('lesson-analysis.json', JSON.stringify(output.analysis, null, 2));
  return written;
}
