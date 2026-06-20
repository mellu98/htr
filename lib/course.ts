import courseJson from '@/content/course.json';
import type { Course, Lesson } from './types';

/**
 * Single source of truth for the course definition.
 * Importing the JSON keeps everything tree-shaken and type-safe.
 */
export const course: Course = courseJson as Course;

export function getLesson(slug: string): Lesson | undefined {
  return course.lessons.find((l) => l.slug === slug);
}

export function getLessonById(id: string): Lesson | undefined {
  return course.lessons.find((l) => l.id === id);
}

export function getNextLesson(slug: string): Lesson | undefined {
  const current = getLesson(slug);
  if (!current) return undefined;
  return course.lessons.find((l) => l.order === current.order + 1);
}

export function getPreviousLesson(slug: string): Lesson | undefined {
  const current = getLesson(slug);
  if (!current) return undefined;
  return course.lessons.find((l) => l.order === current.order - 1);
}

export function getLessonsByModule(moduleId: string): Lesson[] {
  return course.lessons.filter((l) => l.moduleId === moduleId);
}

/** Group lessons by module for sidebar rendering. */
export function getLessonsGrouped(): {
  module: { id: string; title: string; order: number };
  lessons: Lesson[];
}[] {
  const grouped = course.modules.map((m) => ({
    module: m,
    lessons: course.lessons
      .filter((l) => l.moduleId === m.id)
      .sort((a, b) => a.order - b.order),
  }));
  // Include any orphan lessons that aren't bound to a module.
  const knownModuleIds = new Set(course.modules.map((m) => m.id));
  const orphans = course.lessons.filter((l) => !knownModuleIds.has(l.moduleId));
  if (orphans.length) {
    grouped.push({
      module: { id: 'unmapped', title: 'Unmapped lessons', order: 9999 },
      lessons: orphans.sort((a, b) => a.order - b.order),
    });
  }
  return grouped;
}

/** Parse "MM:SS" or "HH:MM:SS" back to seconds (defensive — usually already in JSON). */
export function parseDuration(input: string): number {
  const parts = input.split(':').map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

/** Format seconds as "MM:SS" or "H:MM:SS". */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const s = Math.floor(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) return `${hours}:${mm}:${ss}`;
  return `${minutes}:${ss}`;
}
