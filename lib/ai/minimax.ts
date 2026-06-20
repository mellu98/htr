/**
 * MiniMax adapter — STUB.
 *
 * Today, no model is called: when MINIMAX_API_KEY is missing or empty, every
 * function in this file returns a deterministic mock that the script pipeline
 * (scripts/analyze-video.ts) and the AI Tutor (lib/ai/tutor.ts) both consume.
 *
 * When MINIMAX_API_KEY is provided we log a "would-call" line via
 * `callModel()` and still return mock data so the rest of the app keeps
 * working — the wiring is in place, the network call is not. That keeps
 * "open-source + offline + vendor-agnostic" as the default mode.
 */

import fs from 'node:fs';
import path from 'node:path';
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

export interface MiniMaxConfig {
  apiKey: string | null;
  model: string;
}

export function getMiniMaxConfig(): MiniMaxConfig {
  return {
    apiKey: process.env.MINIMAX_API_KEY?.trim() || null,
    model: process.env.MINIMAX_MODEL?.trim() || 'MiniMax-M3',
  };
}

export function isMiniMaxConfigured(): boolean {
  const { apiKey } = getMiniMaxConfig();
  return Boolean(apiKey && apiKey.length > 0);
}

/**
 * Stub for the model call.
 * Replace this body with a real fetch() / SDK call once the API is wired in.
 *
 * For now it logs a "would-call" line and returns `null` so callers fall back
 * to deterministic mock generation.
 */
export async function callModel(
  prompt: string,
  opts?: { json?: boolean },
): Promise<string | null> {
  if (!isMiniMaxConfigured()) return null;
  // Wiring point — implement the real call here.
  // Example (do not run as-is):
  //   const r = await fetch('https://api.example.com/v1/chat', { ... });
  //   return await r.text();
  console.warn(
    '[minimax] API key present but no real implementation yet — returning mock.',
  );
  return null;
}

// ---------------------------------------------------------------------------
// Public adapter functions (consumed by scripts/analyze-video.ts)
// ---------------------------------------------------------------------------

export async function uploadVideoToMiniMax(videoPath: string): Promise<string> {
  // In a real impl: upload the file, return a remote id (s3 / provider asset id).
  // We log and return a stable synthetic id so the rest of the pipeline is testable.
  const id = `mock-${path.basename(videoPath)}-${Date.now()}`;
  console.log(`[minimax] (mock) would upload ${videoPath} → asset id ${id}`);
  return id;
}

export async function analyzeVideoWithMiniMax(
  videoPath: string,
): Promise<RawModelOutput> {
  const config = getMiniMaxConfig();
  if (!isMiniMaxConfigured()) {
    console.log(
      `[minimax] No API key set — generating mock output for ${videoPath}.`,
    );
    return buildMockOutputFromVideo(videoPath);
  }
  // Real call would happen here. Until then, log + return mock so the UI keeps working.
  console.log(
    `[minimax] (${config.model}) would call real model for ${videoPath}; using mock output.`,
  );
  return buildMockOutputFromVideo(videoPath);
}

/**
 * Normalize whatever the model produced (mock or real) into the shape
 * the rest of the app expects.
 */
export function normalizeMiniMaxOutput(raw: RawModelOutput): NormalizedLessonOutput {
  return {
    transcript: raw.transcript?.trim() || '',
    visualNotes: raw.visualNotes?.trim() || '',
    summary: raw.summary?.trim() || '',
    actionPlan: raw.actionPlan?.trim() || '',
    checklist: Array.isArray(raw.checklist) ? raw.checklist : [],
    quiz: Array.isArray(raw.quiz) ? raw.quiz : [],
    flashcards: Array.isArray(raw.flashcards) ? raw.flashcards : [],
    analysis: raw.analysis ?? null,
  };
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

// ---------------------------------------------------------------------------
// Mock generation — deterministic per lesson so re-running stays stable.
// ---------------------------------------------------------------------------

function deterministicSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
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

  const transcript = `# Transcript — ${title}

> Mock transcript generated locally. The real implementation will call
> MiniMax video understanding and replace this file.

[00:00] Opening: welcome and overview of the lesson.
[02:30] Topic 1: introduction of the core concept.
[08:10] Topic 2: deep dive with practical examples.
[14:45] Topic 3: common mistakes and how to avoid them.
[21:30] Topic 4: actionable framework.
[27:55] Closing summary and next steps.
`;

  const visualNotes = `# Visual Notes — ${title}

Mock description of the visual content for this lesson.

- Slide deck with branded title card and module badge.
- Whiteboard section showing a positioning matrix (axes: clarity vs originality).
- Frame from the video used as case study — ${pick(['a logo lockup', 'a release cover', 'a live performance'], seed)}.
- Recap card with three key takeaways.
`;

  const summary = `# Summary — ${title}

This lesson focuses on the core principle behind ${title.toLowerCase()}.

## Key takeaways

${bullet('Define a clear positioning statement before touching visuals.')}
${bullet('Identify the three audiences you serve: core fans, curious newcomers, industry.')}
${bullet('Translate positioning into repeatable visual and verbal cues.')}
${bullet('Audit your current assets against the positioning — keep, refine, or kill.')}
${bullet('Document the framework so the team can apply it without you.')}

## Why it matters
A consistent positioning compounds: every release reinforces the same idea in the audience's mind.

## What to do next
Pick one asset this week and run it through the positioning audit.
`;

  const checklist: ChecklistItem[] = [
    {
      id: 'check-1',
      title: 'Definisci il posizionamento dell’artista',
      description:
        'Scrivi una dichiarazione di posizionamento in una frase. Deve essere chiara, originale e rilevante per il pubblico target.',
      completed: false,
    },
    {
      id: 'check-2',
      title: 'Identifica i tre segmenti di pubblico',
      description:
        'Core fan, nuovi ascoltatori curiosi, e pubblico industry. Per ciascuno scrivi una nota su cosa si aspettano e come li raggiungi.',
      completed: false,
    },
    {
      id: 'check-3',
      title: 'Fai l’audit degli asset esistenti',
      description:
        'Logo, copertine, bio, foto, video. Per ognuno decidi: tieni, raffina, elimina.',
      completed: false,
    },
    {
      id: 'check-4',
      title: 'Crea un asset di prova',
      description:
        'Applica il posizionamento a un singolo asset reale (una cover, una bio, un post) e misura la reazione.',
      completed: false,
    },
  ];

  const quiz: QuizQuestion[] = [
    {
      id: 'q1',
      question: `Qual è il primo passo del framework trattato in "${title}"?`,
      options: [
        'Cambiare il logo',
        'Definire il posizionamento',
        'Aumentare i follower',
        'Pubblicare più spesso',
      ],
      correctAnswer: 'Definire il posizionamento',
      explanation:
        'Tutti gli altri passaggi derivano da un posizionamento chiaro. Senza, le decisioni estetiche diventano casuali.',
    },
    {
      id: 'q2',
      question: 'Quale di questi NON è uno dei tre segmenti di pubblico citati?',
      options: [
        'Core fan',
        'Industry',
        'Mass market casuale',
        'Curious newcomers',
      ],
      correctAnswer: 'Mass market casuale',
      explanation:
        'I tre segmenti sono: core fan, nuovi curiosi, industry. Il mass market non è un target gestibile in fase early.',
    },
    {
      id: 'q3',
      question: 'Cosa significa "compounding positioning"?',
      options: [
        'Ogni release rinforza la stessa idea nella mente del pubblico',
        'Cambiare posizionamento ad ogni release',
        'Avere più brand contemporaneamente',
        'Acquistare follower a pagamento',
      ],
      correctAnswer:
        'Ogni release rinforza la stessa idea nella mente del pubblico',
      explanation:
        'Coerenza e ripetizione sono ciò che rende un posizionamento memorabile.',
    },
  ];

  const flashcards: Flashcard[] = [
    {
      id: 'f1',
      front: 'Cos’è il posizionamento?',
      back: 'La frase che spiega perché esisti e per chi — prima di tutto il resto.',
      difficulty: 'easy',
    },
    {
      id: 'f2',
      front: 'Tre segmenti di pubblico',
      back: 'Core fan, curious newcomers, industry.',
      difficulty: 'easy',
    },
    {
      id: 'f3',
      front: 'Cosa fa un audit degli asset?',
      back: 'Keep / refine / kill su ogni asset esistente in base al posizionamento.',
      difficulty: 'medium',
    },
    {
      id: 'f4',
      front: 'Output pratico minimo della lezione',
      back: 'Una dichiarazione di posizionamento scritta, approvata, condivisa col team.',
      difficulty: 'medium',
    },
  ];

  const visualElements: VisualElement[] = [
    { type: 'slide', description: 'Title card with module badge and artist branding.' },
    { type: 'whiteboard', description: 'Positioning matrix: clarity vs originality.' },
    { type: 'photo', description: 'Case study asset used as example.' },
    { type: 'diagram', description: 'Three-segment audience map.' },
  ];

  const importantMoments: ImportantMoment[] = [
    {
      timestamp: '02:30',
      title: 'Definizione operativa di posizionamento',
      why: 'Ancora il vocabolario usato nel resto della lezione.',
    },
    {
      timestamp: '14:45',
      title: 'Audit degli asset esistenti',
      why: 'Esempio concreto di applicazione.',
    },
    {
      timestamp: '27:55',
      title: 'Sintesi finale e prossimo passo',
      why: 'Assegnazione operativa.',
    },
  ];

  const analysis: LessonAnalysis = {
    lessonSlug: slug,
    mainTopics: [
      'Definizione di posizionamento',
      'Segmentazione del pubblico',
      'Audit degli asset',
      'Framework di applicazione',
    ],
    visualElements,
    importantMoments,
    practicalOutput:
      'Una dichiarazione di posizionamento scritta, una mappa dei tre segmenti, e un audit con decisione keep/refine/kill per ogni asset chiave.',
    difficulty: 'intermediate',
    recommendedNextAction:
      'Scrivere oggi la bozza di posizionamento e condividerla con una persona fidata per feedback.',
    managerNotes:
      'Verificare che la dichiarazione di posizionamento sia davvero azionabile: deve poter guidare le decisioni di design, comunicazione e release.',
  };

  const actionPlan = `# Action Plan — ${title}

## Entro 24 ore
${bullet('Scrivi una bozza di posizionamento (1 frase).')}
${bullet('Elenca i tuoi tre segmenti di pubblico principali.')}

## Entro la settimana
${bullet('Esegui un audit rapido degli asset esistenti (cover, bio, foto).')}
${bullet('Decidi un asset da rifare applicando il posizionamento.')}
${bullet('Condividi la bozza con un mentore o partner.')}

## Entro il mese
${bullet('Documenta il framework in 1 pagina.')}
${bullet('Allinea il team (se presente) sul posizionamento approvato.')}
`;

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
  writeFile(
    'lesson-analysis.json',
    JSON.stringify(output.analysis, null, 2),
  );

  return written;
}
