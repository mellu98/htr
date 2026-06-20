/**
 * Wave Up — Call Preparation report generator.
 *
 * Pure function: takes the artist's profile + task list + lesson progress,
 * returns a structured report ready to be exported as Markdown and shown
 * in the UI.
 */

import type { ArtistProfile } from '@prisma/client';
import { course } from '@/lib/course';

export interface CallPrepInput {
  artist: ArtistProfile;
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: Date | null;
    completedAt: Date | null;
    expectedOutput: string | null;
  }[];
  completedLessons: number;
  totalLessons: number;
  videoProgressPercent: number;
}

export interface CallPrepReport {
  completedSince: string;
  openTasks: string;
  blocks: string;
  questions: string;
  decisions: string;
  nextWeekPlan: string;
  fullMarkdown: string;
  callDate: Date | null;
}

export function buildCallPrepReport(input: CallPrepInput): CallPrepReport {
  const { artist, tasks } = input;

  const done = tasks.filter((t) => t.status === 'done');
  const open = tasks.filter((t) => t.status !== 'done');
  const blocked = tasks.filter((t) => t.status === 'blocked');
  const inProgress = tasks.filter((t) => t.status === 'in_progress');

  // ---- Completed since ----
  const completedSection = [
    `### Cosa è stato completato`,
    ``,
    done.length
      ? done.map((t) => `- ${t.title}`).join('\n')
      : '_Nessun task chiuso nell\'ultimo periodo. Se è tanto che non chiudi nulla, è un segnale._',
    ``,
    `**Corso HTR Training**: ${input.completedLessons}/${input.totalLessons} lezioni applicate · ${input.videoProgressPercent}% video medio.`,
  ].join('\n');

  // ---- Open tasks ----
  const openSection = [
    `### Task ancora aperti (${open.length})`,
    ``,
    open.length
      ? open
          .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))
          .map((t) => {
            const due = t.dueDate ? ` — entro ${t.dueDate.toLocaleDateString('it-IT')}` : '';
            return `- [${t.status}] **${t.priority}** — ${t.title}${due}${
              t.expectedOutput ? `\n  - _Output atteso_: ${t.expectedOutput}` : ''
            }`;
          })
          .join('\n')
      : '_Nessun task aperto. Definiscine almeno uno prima della prossima call._',
    ``,
    inProgress.length
      ? `**In corso ora (${inProgress.length})**: ${inProgress.map((t) => t.title).join(', ')}`
      : '_Niente in corso adesso._',
  ].join('\n');

  // ---- Blocks ----
  const blocksSection = [
    `### Blocchi principali`,
    ``,
    artist.biggestBlock ? `- (Profilo) **${artist.biggestBlock}**` : '- (Profilo) Nessun blocco registrato.',
    ``,
    blocked.length
      ? `**Task bloccati (${blocked.length})**:\n${blocked.map((t) => `- ${t.title}`).join('\n')}`
      : '_Nessun task bloccato formalmente._',
    ``,
    blocked.length > 0
      ? `⚠ Un blocco che dura più di 5 giorni non è più un blocco: è una decisione che stai evitando. Portala in call.`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  // ---- Questions ----
  const questionsSection = [
    `### Domande da portare al coach umano`,
    ``,
    '1. **Cosa sto sbagliando nel modo in cui affronno [il blocco principale]?**',
    '2. **Su cosa devo essere più duro con me stesso questa settimana?**',
    '3. **Qual è il prossimo passo non-evidente che non vedo da solo?**',
    '',
    'Sostituisci i segnaposto con i tuoi. Se non hai domande specifiche, la call non ti serve.',
  ].join('\n');

  // ---- Decisions ----
  const decisionsSection = [
    `### Decisioni da prendere in call`,
    ``,
    blocked.length
      ? blocked.map((t, i) => `${i + 1}. **Sbloccare o cancellare "${t.title}"** — decidere se serve una sotto-task o va chiuso.`).join('\n')
      : '- Nessuna decisione urgente da forzare in call.',
    '',
    artist.nextReleaseDate
      ? `- **Release del ${artist.nextReleaseDate.toLocaleDateString('it-IT')}** — conferma milestone interne (asset, distribuzione, comunicazione).`
      : '- Nessuna release registrata — decidere se e quando.',
  ].join('\n');

  // ---- Next week plan ----
  const planSection = [
    `### Piano settimana successiva`,
    ``,
    open.length
      ? open
          .slice(0, 3)
          .map((t, i) => `${i + 1}. **${t.title}** (${t.priority})`)
          .join('\n')
      : '- Definire 1 task prioritario prima della prossima call.',
    '',
    'Routine:',
    '- Lun/Mar: task prioritario.',
    '- Mer: review metà settimana.',
    '- Gio: secondo task.',
    '- Ven: call prep + chiusura.',
  ].join('\n');

  const full = [
    `# Wave Up — Call Prep`,
    ``,
    `**Artista**: ${artist.artistName}`,
    artist.musicGenre ? `**Genere**: ${artist.musicGenre}` : '',
    artist.mainGoal ? `**Obiettivo**: ${artist.mainGoal}` : '',
    artist.nextCallAt
      ? `**Prossima call**: ${artist.nextCallAt.toLocaleString('it-IT')}`
      : '**Prossima call**: non fissata',
    `**Generato**: ${new Date().toLocaleString('it-IT')}`,
    `**Corso**: ${course.title} (${input.completedLessons}/${input.totalLessons} lezioni applicate)`,
    ``,
    '---',
    ``,
    completedSection,
    ``,
    openSection,
    ``,
    blocksSection,
    ``,
    questionsSection,
    ``,
    decisionsSection,
    ``,
    planSection,
  ]
    .filter((s) => s !== '')
    .join('\n');

  return {
    completedSince: completedSection,
    openTasks: openSection,
    blocks: blocksSection,
    questions: questionsSection,
    decisions: decisionsSection,
    nextWeekPlan: planSection,
    fullMarkdown: full,
    callDate: artist.nextCallAt,
  };
}

function priorityRank(p: string): number {
  switch (p) {
    case 'urgent':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}
