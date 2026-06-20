import fs from 'node:fs';
import path from 'node:path';
import type {
  ChecklistItem,
  Flashcard,
  LessonAnalysis,
  QuizQuestion,
} from './types';

/**
 * All generated lesson content lives here:
 *   /content/generated/<slug>/{transcript,visual-notes,summary,action-plan}.md
 *   /content/generated/<slug>/{checklist,quiz,flashcards,lesson-analysis}.{md,json}
 *
 * Every reader function MUST tolerate a missing file and return a safe
 * default. The UI is expected to show an "empty state" when content is null.
 */

const CONTENT_ROOT = path.join(process.cwd(), 'content', 'generated');

function lessonDir(slug: string) {
  return path.join(CONTENT_ROOT, slug);
}

function safeRead<T>(parser: (raw: string) => T, fallback: T, ...parts: string[]): T {
  try {
    const full = path.join(...parts);
    if (!fs.existsSync(full)) return fallback;
    const raw = fs.readFileSync(full, 'utf8');
    return parser(raw);
  } catch {
    return fallback;
  }
}

export function hasGeneratedContent(slug: string): boolean {
  const dir = lessonDir(slug);
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).length > 0;
}

export function readTranscript(slug: string): string | null {
  return safeRead<string | null>(
    (raw) => (raw.trim().length ? raw : null),
    null,
    lessonDir(slug),
    'transcript.md',
  );
}

export function readVisualNotes(slug: string): string | null {
  return safeRead<string | null>(
    (raw) => (raw.trim().length ? raw : null),
    null,
    lessonDir(slug),
    'visual-notes.md',
  );
}

export function readSummary(slug: string): string | null {
  return safeRead<string | null>(
    (raw) => (raw.trim().length ? raw : null),
    null,
    lessonDir(slug),
    'summary.md',
  );
}

export function readActionPlan(slug: string): string | null {
  return safeRead<string | null>(
    (raw) => (raw.trim().length ? raw : null),
    null,
    lessonDir(slug),
    'action-plan.md',
  );
}

export function readChecklist(slug: string): ChecklistItem[] | null {
  return safeRead<ChecklistItem[] | null>((raw) => {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      return parsed as ChecklistItem[];
    } catch {
      return null;
    }
  }, null, lessonDir(slug), 'checklist.json');
}

export function readQuiz(slug: string): QuizQuestion[] | null {
  return safeRead<QuizQuestion[] | null>((raw) => {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      return parsed as QuizQuestion[];
    } catch {
      return null;
    }
  }, null, lessonDir(slug), 'quiz.json');
}

export function readFlashcards(slug: string): Flashcard[] | null {
  return safeRead<Flashcard[] | null>((raw) => {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      return parsed as Flashcard[];
    } catch {
      return null;
    }
  }, null, lessonDir(slug), 'flashcards.json');
}

export function readLessonAnalysis(slug: string): LessonAnalysis | null {
  return safeRead<LessonAnalysis | null>((raw) => {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed as LessonAnalysis;
    } catch {
      return null;
    }
  }, null, lessonDir(slug), 'lesson-analysis.json');
}

export interface LessonGeneratedSummary {
  transcript: boolean;
  visualNotes: boolean;
  summary: boolean;
  checklist: boolean;
  quiz: boolean;
  flashcards: boolean;
  actionPlan: boolean;
  analysis: boolean;
}

/**
 * Quick boolean snapshot — useful for cards/badges without reading every file.
 */
export function getLessonGeneratedSummary(slug: string): LessonGeneratedSummary {
  const dir = lessonDir(slug);
  return {
    transcript: fs.existsSync(path.join(dir, 'transcript.md')),
    visualNotes: fs.existsSync(path.join(dir, 'visual-notes.md')),
    summary: fs.existsSync(path.join(dir, 'summary.md')),
    checklist: fs.existsSync(path.join(dir, 'checklist.json')),
    quiz: fs.existsSync(path.join(dir, 'quiz.json')),
    flashcards: fs.existsSync(path.join(dir, 'flashcards.json')),
    actionPlan: fs.existsSync(path.join(dir, 'action-plan.md')),
    analysis: fs.existsSync(path.join(dir, 'lesson-analysis.json')),
  };
}

/** Detect whether the corresponding local MP4 file is present in /public/videos. */
export function isVideoPresent(videoPath: string): boolean {
  // videoPath is like "/videos/01-branding-parte-uno.mp4"
  const filename = path.basename(videoPath);
  const fullPath = path.join(process.cwd(), 'public', 'videos', filename);
  return fs.existsSync(fullPath);
}
