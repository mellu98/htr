import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { course } from '@/lib/course';
import {
  readSummary,
  readLessonAnalysis,
  readActionPlan,
  readChecklist,
  readQuiz,
  readFlashcards,
} from '@/lib/content';

/**
 * Free-form chat corpus.
 *
 * Loads a compressed, file-grounded view of the entire 28-lesson HTR
 * Training course and packs it into a single string suitable for the
 * `system` role of a chat completion.
 *
 * What's kept per lesson (in order):
 *   - summary.md                 (max 1500 chars)
 *   - lesson-analysis.json       (mainTopics, practicalOutput, difficulty, recommendedNextAction)
 *   - action-plan.md             (max 800 chars)
 *   - checklist.json titles only (max 600 chars)
 *   - quiz.json questions only   (max 600 chars)
 *   - flashcards.json fronts     (max 400 chars)
 *
 * What's dropped:
 *   - transcript.md              (low signal for chat, biggest file)
 *   - visual-notes.md            (frame descriptions, not useful for chat)
 *
 * The full corpus is ~80–110 KB ≈ ~30–40K tokens. M3 has a 1M-token
 * context window, so we have headroom for chat history and reply.
 *
 * Each lesson block is hard-capped at MAX_PER_LESSON_CHARS so a single
 * monster lesson can't blow the budget. The cache key is a hash of
 * every source file's mtime; any change (e.g. `npm run analyze:all`)
 * rebuilds the corpus lazily on next call.
 */

const ROOT = path.join(process.cwd(), 'content', 'generated');

const MAX_PER_LESSON_CHARS = 3500;
const MAX_SUMMARY_CHARS = 1500;
const MAX_ACTION_PLAN_CHARS = 800;
const MAX_CHECKLIST_CHARS = 600;
const MAX_QUIZ_CHARS = 600;
const MAX_FLASHCARD_CHARS = 400;

const TRACKED_FILES = [
  'summary.md',
  'lesson-analysis.json',
  'action-plan.md',
  'checklist.json',
  'quiz.json',
  'flashcards.json',
] as const;

interface Cache {
  hash: string;
  body: string;
  builtAt: number;
}

let CACHE: Cache | null = null;

function hashSources(): string {
  const h = crypto.createHash('sha1');
  for (const lesson of course.lessons) {
    for (const f of TRACKED_FILES) {
      const p = path.join(ROOT, lesson.slug, f);
      try {
        const stat = fs.statSync(p);
        h.update(`${p}:${stat.mtimeMs}:${stat.size};`);
      } catch {
        h.update(`${p}:missing;`);
      }
    }
  }
  return h.digest('hex').slice(0, 16);
}

function formatLesson(slug: string): string {
  const lesson = course.lessons.find((l) => l.slug === slug);
  if (!lesson) return `## Lezione (slug sconosciuto: ${slug})\n`;
  const moduleTitle =
    course.modules.find((m) => m.id === lesson.moduleId)?.title ?? lesson.moduleTitle;

  const summary = (readSummary(slug) ?? '').slice(0, MAX_SUMMARY_CHARS);
  const analysis = readLessonAnalysis(slug);
  const actionPlan = (readActionPlan(slug) ?? '').slice(0, MAX_ACTION_PLAN_CHARS);
  const checklist = (readChecklist(slug) ?? [])
    .map((c) => `- ${c.title}`)
    .join('\n')
    .slice(0, MAX_CHECKLIST_CHARS);
  const quizTitles = (readQuiz(slug) ?? [])
    .map((q, i) => `  ${i + 1}. ${q.question}`)
    .join('\n')
    .slice(0, MAX_QUIZ_CHARS);
  const flashTitles = (readFlashcards(slug) ?? [])
    .map((c) => `  - ${c.front}`)
    .join('\n')
    .slice(0, MAX_FLASHCARD_CHARS);

  const lines: string[] = [
    `## Lezione ${lesson.order} — ${lesson.title}`,
    `Modulo: ${moduleTitle}`,
    `Slug: ${slug}`,
    `[fonte: ${slug}]`,
    '',
    '### Sintesi',
    summary || '(non ancora generata)',
    '',
  ];

  if (analysis) {
    lines.push(
      '### Analisi',
      `- Argomenti: ${analysis.mainTopics.join(', ') || '(n/d)'}`,
      `- Output pratico: ${analysis.practicalOutput || '(n/d)'}`,
      `- Difficoltà: ${analysis.difficulty || '(n/d)'}`,
      `- Prossima azione: ${analysis.recommendedNextAction || '(n/d)'}`,
      '',
    );
  }

  lines.push(
    '### Action plan',
    actionPlan || '(non ancora generato)',
    '',
    '### Checklist',
    checklist || '(non ancora generata)',
    '',
  );

  if (quizTitles) {
    lines.push('### Quiz (domande)', quizTitles, '');
  }

  if (flashTitles) {
    lines.push('### Flashcards (fronti)', flashTitles, '');
  }

  const block = lines.join('\n');
  if (block.length > MAX_PER_LESSON_CHARS) {
    return block.slice(0, MAX_PER_LESSON_CHARS) + '\n[…troncato per lunghezza…]';
  }
  return block;
}

export function loadCorpus(): string {
  const hash = hashSources();
  if (CACHE?.hash === hash) return CACHE.body;

  const header = [
    '# CORPUS HTR TRAINING — 28 lezioni, 14 moduli',
    '# Ogni blocco lezione è etichettato con il proprio slug.',
    '# Quando attingi da una lezione specifica, cita il suo slug nel testo',
    '# come tag inline nel formato: [fonte: <slug-della-lezione>]',
    '',
  ].join('\n');

  const body = course.lessons.map((l) => formatLesson(l.slug)).join('\n\n---\n\n');

  const full = header + body;
  CACHE = { hash, body: full, builtAt: Date.now() };
  // eslint-disable-next-line no-console
  console.log(
    `[chat-corpus] built ${(full.length / 1024).toFixed(1)} KB ` +
      `(${course.lessons.length} lessons, hash ${hash})`,
  );
  return full;
}

export function invalidateCorpusCache(): void {
  CACHE = null;
}

export function corpusSizeBytes(): number {
  return CACHE?.body.length ?? 0;
}
