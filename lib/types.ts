/**
 * Core type definitions for HTR Training Brain.
 * Keep this file pure — no runtime imports, no side effects.
 */

export type AIStatus =
  | 'not_analyzed'
  | 'processing'
  | 'generated'
  | 'reviewed'
  | 'approved'
  | 'error';

export type ReviewStatus =
  | 'pending'
  | 'reviewed'
  | 'needs_edits'
  | 'approved';

export interface CourseModule {
  id: string;
  title: string;
  order: number;
}

export interface Lesson {
  id: string;
  moduleId: string;
  moduleTitle: string;
  slug: string;
  title: string;
  duration: string; // formatted "MM:SS" or "HH:MM:SS"
  durationSeconds: number;
  videoPath: string;
  order: number;
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  source: string;
  version: string;
  totalLessons: number;
  modules: CourseModule[];
  lessons: Lesson[];
}

// ---------------------------------------------------------------------------
// Generated content types (what lives in /content/generated/[slug]/...)
// ---------------------------------------------------------------------------

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed?: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ImportantMoment {
  timestamp: string; // "MM:SS"
  title: string;
  why: string;
}

export interface VisualElement {
  type: 'slide' | 'whiteboard' | 'screen' | 'diagram' | 'photo' | 'other';
  description: string;
  at?: string; // "MM:SS" optional
}

export interface LessonAnalysis {
  lessonSlug: string;
  mainTopics: string[];
  visualElements: VisualElement[];
  importantMoments: ImportantMoment[];
  practicalOutput: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  recommendedNextAction: string;
  managerNotes: string;
}

export type GeneratedFiles =
  | 'transcript.md'
  | 'visual-notes.md'
  | 'summary.md'
  | 'action-plan.md'
  | 'checklist.json'
  | 'quiz.json'
  | 'flashcards.json'
  | 'lesson-analysis.json';

// ---------------------------------------------------------------------------
// Runtime status (computed per-lesson, used by the UI)
// ---------------------------------------------------------------------------

export interface LessonRuntimeStatus {
  lessonSlug: string;
  videoPresent: boolean;
  aiStatus: AIStatus;
  reviewStatus: ReviewStatus;
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
  progress: {
    videoPercent: number;
    completed: boolean;
    applied: boolean;
  };
}
