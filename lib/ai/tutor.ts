/**
 * AI Tutor — works entirely from local generated content.
 *
 * Every prompt returns a deterministic response built from whatever files
 * exist in /content/generated/[slug]/, plus the lesson metadata.
 * No live API call is ever made from the UI — this is intentional and
 * documented in the README.
 */

import type { Lesson } from '@/lib/types';
import {
  readActionPlan,
  readChecklist,
  readFlashcards,
  readLessonAnalysis,
  readSummary,
  readTranscript,
} from '@/lib/content';
import { TUTOR_PROMPTS } from './tutor-prompts';
import type { TutorPromptId } from './tutor-prompts';

export { TUTOR_PROMPTS };
export type { TutorPromptId };

export interface TutorResponse {
  promptId: TutorPromptId;
  title: string;
  body: string;
  sourcesUsed: string[];
}

/**
 * Run a tutor prompt against local content only.
 * If no generated content exists, returns a graceful fallback that points
 * the user to the AI Processing page.
 */
export function runTutor(lesson: Lesson, promptId: TutorPromptId): TutorResponse {
  const summary = readSummary(lesson.slug);
  const transcript = readTranscript(lesson.slug);
  const checklist = readChecklist(lesson.slug);
  const flashcards = readFlashcards(lesson.slug);
  const analysis = readLessonAnalysis(lesson.slug);
  const actionPlan = readActionPlan(lesson.slug);

  const sourcesUsed: string[] = [];
  if (summary) sourcesUsed.push('summary.md');
  if (transcript) sourcesUsed.push('transcript.md');
  if (checklist) sourcesUsed.push('checklist.json');
  if (flashcards) sourcesUsed.push('flashcards.json');
  if (analysis) sourcesUsed.push('lesson-analysis.json');
  if (actionPlan) sourcesUsed.push('action-plan.md');

  if (sourcesUsed.length === 0) {
    return {
      promptId,
      title: 'Contenuto non ancora generato',
      body: [
        `Non ho ancora output generato per la lezione "${lesson.title}".`,
        ``,
        `Per attivare il tutor devi prima generare i contenuti:`,
        ``,
        `\`\`\`bash`,
        `npm run analyze:video ${lesson.slug}`,
        `\`\`\``,
        ``,
        `Oppure apri la pagina **AI Processing** e lancia l'analisi mock per la lezione.`,
      ].join('\n'),
      sourcesUsed,
    };
  }

  const baseFacts = buildFactSheet(lesson, summary, analysis);

  switch (promptId) {
    case 'summarize':
      return {
        promptId,
        title: `Riassunto di ${lesson.title}`,
        body: summary ?? baseFacts.summaryFallback,
        sourcesUsed,
      };
    case 'explain-to-artist':
      return {
        promptId,
        title: `Spiegazione per artista — ${lesson.title}`,
        body: explainToArtist(baseFacts),
        sourcesUsed,
      };
    case 'create-exercise':
      return {
        promptId,
        title: `Esercizio pratico — ${lesson.title}`,
        body: createExercise(baseFacts, checklist),
        sourcesUsed,
      };
    case 'manager-actions':
      return {
        promptId,
        title: `Cosa deve fare il manager — ${lesson.title}`,
        body: managerActions(baseFacts, analysis),
        sourcesUsed,
      };
    case 'key-points':
      return {
        promptId,
        title: `Punti chiave — ${lesson.title}`,
        body: keyPoints(baseFacts, flashcards),
        sourcesUsed,
      };
    case 'operational-script':
      return {
        promptId,
        title: `Script operativo — ${lesson.title}`,
        body: operationalScript(baseFacts, actionPlan, checklist),
        sourcesUsed,
      };
    case 'mistakes-to-avoid':
      return {
        promptId,
        title: `Errori da evitare — ${lesson.title}`,
        body: mistakesToAvoid(baseFacts, analysis),
        sourcesUsed,
      };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface FactSheet {
  lesson: Lesson;
  summary: string | null;
  analysisTopics: string[];
  difficulty: string;
  practicalOutput: string;
  nextAction: string;
  summaryFallback: string;
}

function buildFactSheet(
  lesson: Lesson,
  summary: string | null,
  analysis: ReturnType<typeof readLessonAnalysis>,
): FactSheet {
  return {
    lesson,
    summary,
    analysisTopics: analysis?.mainTopics ?? [],
    difficulty: analysis?.difficulty ?? 'intermediate',
    practicalOutput:
      analysis?.practicalOutput ?? 'Output pratico non ancora generato.',
    nextAction:
      analysis?.recommendedNextAction ??
      'Apri la pagina AI Processing per generare l’output.',
    summaryFallback: `La lezione "${lesson.title}" (${lesson.duration}) appartiene al modulo ${lesson.moduleTitle}. Avvia l'analisi AI per ottenere un riassunto dettagliato.`,
  };
}

function explainToArtist(f: FactSheet): string {
  return [
    `Ecco come spiegheresti "${f.lesson.title}" a un artista, senza gergo:`,
    ``,
    `**Idea centrale**: ${firstSentence(f.practicalOutput)}`,
    ``,
    `**Perché ti interessa**: questa lezione ti aiuta a decidere *prima* di produrre, non dopo. Risparmia tempo, soldi e reputazione.`,
    ``,
    `**Cosa ricordare stasera**:`,
    ...f.analysisTopics.slice(0, 3).map((t) => `- ${t}`),
    ``,
    `**Domani, cosa fai**: ${f.nextAction}`,
  ].join('\n');
}

function createExercise(
  f: FactSheet,
  checklist: ReturnType<typeof readChecklist>,
): string {
  const items = checklist?.slice(0, 3) ?? [];
  return [
    `Esercizio di oggi basato su "${f.lesson.title}". Tempo stimato: 30 minuti.`,
    ``,
    `1. **Apri un documento vuoto** e rispondi a UNA sola domanda: ${f.analysisTopics[0] ?? 'qual è la tua posizione?'}`,
    `2. **Scrivi in massimo 3 frasi**. Niente elenchi. Se non riesci, il problema è a monte.`,
    `3. **Mostra il testo a una persona di cui ti fidi** e chiedi: "Capisci di cosa mi occupo?"`,
    `4. **Itera fino a quando la risposta è sì** senza dover spiegare nulla.`,
    ...(items.length
      ? [
          ``,
          `**Checklist di follow-up** (vedi tab Checklist):`,
          ...items.map((it) => `- ${it.title}`),
        ]
      : []),
  ].join('\n');
}

function managerActions(
  f: FactSheet,
  analysis: ReturnType<typeof readLessonAnalysis>,
): string {
  const notes = analysis?.managerNotes ?? '';
  return [
    `Tre cose che il manager dovrebbe fare entro la settimana dopo "${f.lesson.title}":`,
    ``,
    `1. **Verificare l'output operativo** generato dall'artista. Deve essere concreto, scritto, condivisibile.`,
    `2. **Collegarlo alla pipeline release**: come si applica al prossimo drop / comunicato / show?`,
    `3. **Validare con dati**: la dichiarazione regge se la testiamo sul prossimo annuncio?`,
    notes ? `\n**Note manageriali**: ${notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function keyPoints(
  f: FactSheet,
  flashcards: ReturnType<typeof readFlashcards>,
): string {
  if (flashcards && flashcards.length) {
    return [
      `Punti chiave di "${f.lesson.title}":`,
      ``,
      ...flashcards.map((c) => `- **${c.front}** → ${c.back}`),
    ].join('\n');
  }
  return [
    `Punti chiave di "${f.lesson.title}":`,
    ``,
    ...f.analysisTopics.map((t) => `- ${t}`),
    ``,
    `(Apri la tab Flashcards per allenare questi concetti.)`,
  ].join('\n');
}

function operationalScript(
  f: FactSheet,
  actionPlan: ReturnType<typeof readActionPlan>,
  checklist: ReturnType<typeof readChecklist>,
): string {
  if (actionPlan) {
    return [
      `Script operativo pronto da applicare per "${f.lesson.title}":`,
      ``,
      actionPlan,
      checklist?.length
        ? `\nVedi anche la tab **Checklist** per la versione interattiva.`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
  return [
    `Script operativo di base per "${f.lesson.title}":`,
    ``,
    `1. Definisci il risultato atteso.`,
    `2. Scomponilo in 3 step da completare questa settimana.`,
    `3. Scegli UN solo output concreto.`,
    `4. Validalo con una persona esterna.`,
    `5. Documenta cosa ha funzionato.`,
    ``,
    `(Genera prima i contenuti della lezione per una versione più specifica.)`,
  ].join('\n');
}

function mistakesToAvoid(
  f: FactSheet,
  analysis: ReturnType<typeof readLessonAnalysis>,
): string {
  const minutes = Math.round(f.lesson.durationSeconds / 60);
  return [
    `I 5 errori più comuni dopo "${f.lesson.title}" (durata ${minutes} min):`,
    ``,
    `1. **Passare all'esecuzione senza aver scritto il posizionamento**. È l'errore più frequente.`,
    `2. **Confondere "mi piace" con "funziona"**. Testalo con un esterno.`,
    `3. **Cambiare idea ogni settimana**. La coerenza è ciò che crea identità.`,
    `4. **Sottovalutare la documentazione**. Se non è scritto, non esiste.`,
    `5. **Non applicare la lezione al prossimo rilascio**. Se non cambia nulla di concreto, è tempo perso.`,
    analysis?.managerNotes
      ? `\n**Dal manager**: ${analysis.managerNotes}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function firstSentence(text: string): string {
  const cleaned = text.trim();
  const idx = cleaned.indexOf('. ');
  if (idx === -1) return cleaned;
  return cleaned.slice(0, idx + 1);
}
