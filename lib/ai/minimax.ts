/**
 * MiniMax adapter.
 *
 * Wires the project to a real MiniMax chat-completions endpoint with an
 * OpenAI-compatible payload (works against api.minimax.io and any
 * OpenAI-compatible proxy the user might want to point at via
 * MINIMAX_BASE_URL).
 *
 * Behavior:
 *   - MINIMAX_API_KEY unset/empty → every function returns deterministic
 *     mock output. The script pipeline + AI Tutor keep working offline,
 *     which preserves the "open-source, vendor-agnostic, no-key-needed"
 *     default.
 *   - MINIMAX_API_KEY set → `callModel()` issues a real POST to
 *     `${MINIMAX_BASE_URL}/chat/completions` with Bearer auth, returns
 *     the model text. Any network / parse error is thrown so callers can
 *     decide whether to fall back to mock or surface the error.
 *   - analyzeVideoWithMiniMax() composes a single JSON request covering
 *     the full lesson artifact set (transcript, summary, checklist, quiz,
 *     flashcards, action plan, lesson analysis) and parses the response
 *     into RawModelOutput. JSON mode is requested via response_format.
 *     If the model call fails, we log + fall back to mock so the rest of
 *     the pipeline (file generation, review UI) keeps working.
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
  baseUrl: string;
}

const DEFAULT_BASE_URL = 'https://api.minimax.io/v1';
const DEFAULT_MODEL = 'MiniMax-M3';

export function getMiniMaxConfig(): MiniMaxConfig {
  return {
    apiKey: process.env.MINIMAX_API_KEY?.trim() || null,
    model: process.env.MINIMAX_MODEL?.trim() || DEFAULT_MODEL,
    baseUrl: (process.env.MINIMAX_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(
      /\/+$/,
      '',
    ),
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
  // Remove all <think>...</think> blocks (greedy across newlines).
  out = out.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Strip a leading/trailing markdown JSON fence if present.
  const fence = /^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/i.exec(out);
  if (fence) out = fence[1];
  return out.trim();
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

/**
 * Issue a real chat-completions call against the configured MiniMax
 * endpoint. Returns the assistant message text, or null when no key is
 * configured (callers can then fall back to mock).
 *
 * Throws MiniMaxApiError on non-2xx responses so callers can decide
 * whether to retry, surface the error, or fall back to mock.
 */
export async function callModel(
  prompt: string,
  opts?: { json?: boolean; system?: string; temperature?: number },
): Promise<string | null> {
  if (!isMiniMaxConfigured()) return null;

  const config = getMiniMaxConfig();
  const url = `${config.baseUrl}/chat/completions`;

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (opts?.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: prompt });

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: opts?.temperature ?? 0.7,
  };
  if (opts?.json) {
    body.response_format = { type: 'json_object' };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(
      `[minimax] network error calling ${url} (key=${maskKey(config.apiKey)}): ${
        (err as Error).message
      }`,
    );
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new MiniMaxApiError(res.status, res.statusText, errText);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error(
      `[minimax] unexpected response shape (no choices[0].message.content string): ${JSON.stringify(
        data,
      ).slice(0, 500)}`,
    );
  }
  return stripThinkingAndFences(content);
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
  if (!isMiniMaxConfigured()) {
    console.log(
      `[minimax] No API key set — generating mock output for ${videoPath}.`,
    );
    return buildMockOutputFromVideo(videoPath);
  }

  const config = getMiniMaxConfig();
  const filename = path.basename(videoPath);
  const lesson = course.lessons.find((l) => l.videoPath.endsWith(filename));
  const lessonTitle = lesson?.title ?? filename;
  const moduleTitle = lesson
    ? (course.modules.find((m) => m.id === lesson.moduleId)?.title ?? '')
    : '';

  // Build a single JSON request covering all the lesson artifacts the rest
  // of the app expects. The model is asked to estimate the transcript from
  // the lesson title + module context — we don't have an ASR step here yet,
  // so the transcript is best-effort rather than verbatim. If we later wire
  // Whisper / Deepgram, this prompt gets a real transcript instead of the
  // "(stima dal titolo)" placeholder section.
  const prompt = `Sei un coach didattico per il corso HTR Training (music business per artisti italiani).
Devi produrre un pacchetto didattico completo in italiano per la seguente lezione:

- Titolo lezione: ${lessonTitle}
- Modulo: ${moduleTitle}
- File video: ${filename}

Rispondi ESCLUSIVAMENTE con un JSON valido (nessun testo prima o dopo) che rispetti esattamente questo schema:

{
  "transcript": "stringa markdown con trascrizione stimata (sezioni [MM:SS] + testo parlato)",
  "visualNotes": "stringa markdown che descrive cosa si vede nel video (slide, whiteboard, schermo, foto, grafici)",
  "summary": "stringa markdown con sezione 'Key takeaways' (5 bullet), 'Why it matters', 'What to do next'",
  "actionPlan": "stringa markdown con sezioni 'Entro 24 ore', 'Entro la settimana', 'Entro il mese', ciascuna con 2-3 bullet",
  "checklist": [
    { "id": "check-1", "title": "titolo breve azionabile", "description": "descrizione più dettagliata", "completed": false }
  ] (3-5 elementi),
  "quiz": [
    { "id": "q1", "question": "domanda", "options": ["a", "b", "c", "d"], "correctAnswer": "una delle opzioni esattamente", "explanation": "perché" }
  ] (3 domande),
  "flashcards": [
    { "id": "f1", "front": "domanda/concetto", "back": "risposta", "difficulty": "easy|medium|hard" }
  ] (4 elementi),
  "analysis": {
    "lessonSlug": "${lesson?.slug ?? 'unknown'}",
    "mainTopics": ["topic1", "topic2", "topic3", "topic4"],
    "visualElements": [{ "type": "slide|whiteboard|photo|diagram|screen", "description": "..." }],
    "importantMoments": [{ "timestamp": "MM:SS", "title": "...", "why": "..." }],
    "practicalOutput": "deliverable concreto che lo studente produce dopo la lezione",
    "difficulty": "beginner|intermediate|advanced",
    "recommendedNextAction": "azione specifica per la prossima settimana",
    "managerNotes": "cosa deve verificare un manager per assicurarsi che l'articolo abbia capito"
  }
}

Vincoli:
- Tutti i testi in italiano, tono professionale ma diretto.
- Le domande del quiz devono avere UNA sola risposta corretta, presente testualmente nelle options.
- Le flashcard devono essere auto-esplicative (front e back leggibili da soli).
- I timestamp di importantMoments in formato MM:SS.
- Nessun campo può essere null o vuoto. Se non sai un campo, inferiscilo dal titolo della lezione.`;

  try {
    const raw = await callModel(prompt, {
      json: true,
      temperature: 0.6,
      system:
        'Sei un coach didattico per il corso HTR Training. Rispondi solo con JSON valido.',
    });
    if (!raw) return buildMockOutputFromVideo(videoPath);

    const parsed = JSON.parse(stripThinkingAndFences(raw)) as RawModelOutput;
    if (!parsed.analysis) {
      parsed.analysis = {
        lessonSlug: lesson?.slug ?? 'unknown',
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
  } catch (err) {
    console.error(
      `[minimax] analyzeVideo failed for ${videoPath} — falling back to mock.`,
      (err as Error).message,
    );
    return buildMockOutputFromVideo(videoPath);
  }
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
