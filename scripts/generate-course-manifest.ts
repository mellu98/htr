/**
 * generate-course-manifest.ts
 *
 * Inspects /public/videos/ and /content/generated/ and prints (and writes)
 * a JSON manifest describing what's actually present.
 *
 * The manifest is useful as a sanity check after dropping new files,
 * and is read by the dashboard to show import / generation status
 * without doing filesystem scans at request time.
 *
 * Usage:
 *   npm run generate:manifest
 */

import path from 'node:path';
import fs from 'node:fs';
import courseJson from '../content/course.json';

const course = courseJson as typeof courseJson;
const ROOT = process.cwd();
const PUBLIC_VIDEOS = path.join(ROOT, 'public', 'videos');
const CONTENT_GENERATED = path.join(ROOT, 'content', 'generated');
const MANIFEST_PATH = path.join(ROOT, 'content', 'manifest.json');

interface LessonManifest {
  id: string;
  slug: string;
  title: string;
  moduleTitle: string;
  duration: string;
  videoPath: string;
  videoPresent: boolean;
  videoBytes: number | null;
  generated: {
    transcript: boolean;
    visualNotes: boolean;
    summary: boolean;
    checklist: boolean;
    quiz: boolean;
    flashcards: boolean;
    actionPlan: boolean;
    analysis: boolean;
  };
}

function readDirSafe(p: string): string[] {
  try {
    return fs.readdirSync(p);
  } catch {
    return [];
  }
}

function exists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function buildManifest(): LessonManifest[] {
  return course.lessons.map((lesson) => {
    const videoFile = path.join(ROOT, 'public', lesson.videoPath);
    const present = exists(videoFile);
    const dir = path.join(CONTENT_GENERATED, lesson.slug);
    return {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      moduleTitle: lesson.moduleTitle,
      duration: lesson.duration,
      videoPath: lesson.videoPath,
      videoPresent: present,
      videoBytes: present ? fs.statSync(videoFile).size : null,
      generated: {
        transcript: exists(path.join(dir, 'transcript.md')),
        visualNotes: exists(path.join(dir, 'visual-notes.md')),
        summary: exists(path.join(dir, 'summary.md')),
        checklist: exists(path.join(dir, 'checklist.json')),
        quiz: exists(path.join(dir, 'quiz.json')),
        flashcards: exists(path.join(dir, 'flashcards.json')),
        actionPlan: exists(path.join(dir, 'action-plan.md')),
        analysis: exists(path.join(dir, 'lesson-analysis.json')),
      },
    };
  });
}

function main() {
  console.log('─'.repeat(72));
  console.log('HTR Training Brain — Generate course manifest');
  console.log('─'.repeat(72));

  if (!exists(PUBLIC_VIDEOS)) {
    console.warn(`⚠ /public/videos does not exist yet. Create it and drop your mp4 files there.`);
    fs.mkdirSync(PUBLIC_VIDEOS, { recursive: true });
  }

  const manifest = buildManifest();
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  const imported = manifest.filter((m) => m.videoPresent).length;
  const generated = manifest.filter((m) => m.generated.analysis).length;

  console.log(`Lessons in catalog: ${manifest.length}`);
  console.log(`Local videos imported: ${imported}`);
  console.log(`AI output generated:   ${generated}`);
  console.log(`Manifest written:      ${path.relative(ROOT, MANIFEST_PATH)}`);
  console.log('');
  console.log('Per-lesson snapshot:');
  for (const m of manifest) {
    const flags = [
      m.videoPresent ? 'V' : '·',
      m.generated.transcript ? 'T' : '·',
      m.generated.summary ? 'S' : '·',
      m.generated.checklist ? 'C' : '·',
      m.generated.quiz ? 'Q' : '·',
      m.generated.flashcards ? 'F' : '·',
      m.generated.visualNotes ? 'N' : '·',
      m.generated.actionPlan ? 'A' : '·',
      m.generated.analysis ? 'X' : '·',
    ].join('');
    console.log(`  [${flags}] ${m.slug.padEnd(36)} ${m.title}`);
  }
  console.log('');
  console.log('Legend: V=video · T=transcript · S=summary · C=checklist · Q=quiz · F=flashcard · N=visual-notes · A=action-plan · X=analysis');
}

main();
