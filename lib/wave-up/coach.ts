/**
 * Wave Up Coach — the AI Coach for music artists and managers.
 *
 * Tone of voice:
 *   - Coaching, never generic.
 *   - Concrete, never abstract.
 *   - Diagnostic first, prescriptive second.
 *   - Always proposes the next single action.
 *
 * Inputs:
 *   - Artist profile (if available): the artist's name, level, goal, block.
 *   - Lesson context (optional): a slug + outputs from /content/generated/.
 *   - Existing tasks: so the coach can ask "what blocked you?" instead of
 *     recommending a new thing.
 *   - Open call-prep: so the coach can prepare the user for next week.
 *
 * The coach NEVER calls a live API. Everything is built from local context
 * (profile + tasks + generated lesson files). This makes the coach:
 *   - Always available (offline-first).
 *   - Deterministic and testable.
 *   - Honest: every claim is anchored to a real artifact.
 *
 * If we later want a generative layer, we wire it via `callModel()` from
 * lib/ai/minimax.ts (currently a stub).
 */

import type { ArtistProfile } from '@prisma/client';
import type { Lesson } from '@/lib/types';

export type CoachPromptId =
  | 'positioning'
  | 'lesson-to-task'
  | 'this-week'
  | 'call-prep'
  | 'unblock'
  | 'plan-7'
  | 'plan-30'
  | 'apply-to-artist'
  | 'release-plan'
  | 'content-week'
  | 'metrics-review'
  | 'outreach-plan'
  | 'goal-check';

export interface CoachPrompt {
  id: CoachPromptId;
  label: string;
  description: string;
  category: 'diagnostic' | 'planning' | 'execution' | 'reflection' | 'growth';
}

export const COACH_PROMPTS: CoachPrompt[] = [
  {
    id: 'positioning',
    label: 'Aiutami a capire il mio posizionamento',
    description: '5 domande per estrarre una dichiarazione di posizionamento utilizzabile.',
    category: 'diagnostic',
  },
  {
    id: 'lesson-to-task',
    label: 'Trasforma questa lezione in task per il mio progetto',
    description: 'Prendi una lezione e produci 3-5 task operativi per il mio caso specifico.',
    category: 'execution',
  },
  {
    id: 'this-week',
    label: 'Cosa devo fare questa settimana?',
    description: 'Massimo 3 task, in ordine di priorità, da chiudere entro venerdì.',
    category: 'planning',
  },
  {
    id: 'call-prep',
    label: 'Preparami alla prossima call',
    description: 'Snapshot di dove sei, dove sei bloccato, cosa chiedere al coach umano.',
    category: 'reflection',
  },
  {
    id: 'unblock',
    label: 'Analizza il mio blocco attuale',
    description: 'Tre ipotesi sul perché sei bloccato e l\'azione minima per testarle.',
    category: 'diagnostic',
  },
  {
    id: 'plan-7',
    label: 'Dammi un piano 7 giorni',
    description: 'Una sequenza giornaliera, leggera, concreta.',
    category: 'planning',
  },
  {
    id: 'plan-30',
    label: 'Dammi un piano 30 giorni',
    description: 'Una roadmap mensile con milestone verificabili.',
    category: 'planning',
  },
  {
    id: 'apply-to-artist',
    label: 'Come posso applicarlo al mio artista?',
    description: 'Per i manager: traduci la lezione in azioni per uno specifico artista del roster.',
    category: 'execution',
  },
  {
    id: 'release-plan',
    label: 'Preparami il piano di lancio',
    description: 'Per una release: diagnosi, 3 milestone, 5 contenuti, 3 outreach, 1 metrica da guardare.',
    category: 'growth',
  },
  {
    id: 'content-week',
    label: 'Cosa pubblico questa settimana?',
    description: '5 idee con hook, formato, CTA e piattaforma consigliata.',
    category: 'growth',
  },
  {
    id: 'metrics-review',
    label: 'Analizza i miei risultati',
    description: 'Cosa sta crescendo, cosa è fermo, cosa testare, quale metrica guardare.',
    category: 'growth',
  },
  {
    id: 'outreach-plan',
    label: 'Chi devo contattare?',
    description: 'Categorie di contatti utili, messaggio base, follow-up, priorità.',
    category: 'growth',
  },
  {
    id: 'goal-check',
    label: 'Sto andando verso l\'obiettivo?',
    description: 'Stato obiettivi, rischio, prossima azione.',
    category: 'growth',
  },
];

export interface CoachContext {
  artist: ArtistProfile | null;
  lesson: Lesson | null;
  lessonSlug?: string;
  /**
   * Pre-loaded lesson analysis/summary. The Coach itself is pure — the
   * caller (a server route or page) is responsible for reading these from
   * disk via `lib/content.ts`. This keeps the Coach module free of any
   * node:fs imports so it can be safely bundled into the client.
   */
  lessonAnalysis?: import('@/lib/types').LessonAnalysis | null;
  lessonSummary?: string | null;
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: Date | null;
    expectedOutput: string | null;
  }[];
  activeTaskCount: number;
  blockedTaskCount: number;
  nextCallAt: Date | null;
  /** Release context — used by the 5 growth prompts. */
  releases?: {
    id: string;
    title: string;
    type: string;
    status: string;
    releaseDate: Date | null;
    mainGoal: string | null;
    milestones: { id: string; title: string; status: string; priority: string; dueDate: Date | null }[];
    contentIdeas: { id: string; title: string; platform: string; format: string; status: string; publishAt: Date | null }[];
    goals: { id: string; title: string; metric: string; targetValue: number; currentValue: number; status: string; deadline: Date | null }[];
    outreach: { id: string; channel: string; status: string; contactName: string; nextFollowUpAt: Date | null }[];
  }[];
  contentIdeas?: { id: string; title: string; platform: string; format: string; status: string; publishAt: Date | null }[];
  metrics?: { id: string; platform: string; date: Date; followers: number | null; views: number | null; streams: number | null; linkClicks: number | null }[];
  goals?: { id: string; title: string; metric: string; targetValue: number; currentValue: number; status: string; deadline: Date | null }[];
  outreach?: { id: string; channel: string; status: string; contactName: string; nextFollowUpAt: Date | null }[];
}

export interface CoachResponse {
  promptId: CoachPromptId;
  title: string;
  body: string;
  sourcesUsed: string[];
  /** Suggested tasks the user can drop into the Task board with one click. */
  suggestedTasks: SuggestedTask[];
}

export interface SuggestedTask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expectedOutput: string;
  dueInDays?: number;
}

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

export function runCoach(
  promptId: CoachPromptId,
  context: CoachContext,
): CoachResponse {
  switch (promptId) {
    case 'positioning':
      return positioningDiagnostic(context);
    case 'lesson-to-task':
      return lessonToTask(context);
    case 'this-week':
      return thisWeek(context);
    case 'call-prep':
      return callPrepBrief(context);
    case 'unblock':
      return unblockAnalysis(context);
    case 'plan-7':
      return plan7Days(context);
    case 'plan-30':
      return plan30Days(context);
    case 'apply-to-artist':
      return applyToArtist(context);
    case 'release-plan':
      return releasePlan(context);
    case 'content-week':
      return contentWeek(context);
    case 'metrics-review':
      return metricsReview(context);
    case 'outreach-plan':
      return outreachPlan(context);
    case 'goal-check':
      return goalCheck(context);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function artistTagline(a: ArtistProfile | null): string {
  if (!a) return '(nessun profilo artista configurato)';
  const parts = [a.artistName];
  if (a.musicGenre) parts.push(`· ${a.musicGenre}`);
  if (a.currentLevel) parts.push(`· ${a.currentLevel}`);
  return parts.join(' ');
}

function openTasksText(context: CoachContext): string {
  if (context.tasks.length === 0)
    return 'Nessun task aperto. Impossibile procedere: prima definisci cosa stai costruendo.';
  return context.tasks
    .filter((t) => t.status !== 'done')
    .map(
      (t) =>
        `- [${t.status}] (${t.priority}) ${t.title}${
          t.dueDate ? ` — entro ${new Date(t.dueDate).toLocaleDateString()}` : ''
        }`,
    )
    .join('\n');
}

function todayString(): string {
  return new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function withFrame(title: string, body: string): string {
  return `## ${title}\n\n${body}`;
}

// ---------------------------------------------------------------------------
// Prompt implementations
// ---------------------------------------------------------------------------

function positioningDiagnostic(context: CoachContext): CoachResponse {
  const a = context.artist;
  const headline = a
    ? `Lavoriamo sul posizionamento di ${a.artistName}.`
    : 'Lavoriamo sul tuo posizionamento.';

  return {
    promptId: 'positioning',
    title: 'Diagnostica di posizionamento',
    body: withFrame(
      'Posizionamento — base operativa',
      [
        `${headline}`,
        '',
        'Partiamo dal metodo: il posizionamento è UNA frase che spiega *perché esisti e per chi*, prima di tutto il resto. Niente aggettivi, niente "musica innovativa" — quelli sono sintomi.',
        '',
        '**Le 5 domande che ti faccio ora. Rispondi a TUTTE, anche in una riga ciascuna.**',
        '',
        '1. **A chi parli davvero?** Non al pubblico generico, ma alla persona specifica che ti ascolterebbe alle 2 di notte. Descrivila: età, momento della giornata, cosa sta cercando.',
        '2. **Cosa fai di loro che nessun altro fa?** Non "canzone bella" — la cosa per cui pagherebbero, tornerebbero, condividerebbero.',
        '3. **Cosa NON sei?** Questa domanda è quella che quasi tutti saltano. Rispondere ti protegge dall\'essere tutto per tutti (che è uguale a non essere per nessuno).',
        '4. **Qual è la tua reference artist su cui ti misuri?** Non per copiare, ma per capire il "campo di gioco" in cui il pubblico ti legge.',
        '5. **Cosa vuoi che pensino di te tra 30 secondi?** Il pensiero singolo, non un elenco.',
        '',
        '---',
        '',
        '**Prossima azione singola**: scrivi le 5 risposte in un documento, massimo 5 righe ciascuna. Poi derivane una frase di posizionamento. Portala venerdì.',
        '',
        openTasksText(context),
      ].join('\n'),
    ),
    sourcesUsed: a ? ['ArtistProfile'] : [],
    suggestedTasks: [
      {
        title: 'Rispondi alle 5 domande di posizionamento',
        description:
          'Le 5 risposte diventano la bozza di posizionamento (5 righe max ciascuna).',
        priority: 'high',
        expectedOutput: 'Un documento condiviso con 5 risposte + 1 frase di posizionamento.',
        dueInDays: 2,
      },
    ],
  };
}

function lessonToTask(context: CoachContext): CoachResponse {
  const slug = context.lessonSlug;
  const lesson = context.lesson;
  const analysis = context.lessonAnalysis ?? null;
  const summary = context.lessonSummary ?? null;

  const lessonTitle = lesson?.title ?? slug ?? 'la lezione selezionata';
  const sources: string[] = [];
  if (summary) sources.push('summary.md');
  if (analysis) sources.push('lesson-analysis.json');

  const topics = analysis?.mainTopics ?? [];
  const practicalOutput = analysis?.practicalOutput ?? '';

  return {
    promptId: 'lesson-to-task',
    title: `Da "${lessonTitle}" a task operativi`,
    body: withFrame(
      `${lessonTitle} → task`,
      [
        context.artist
          ? `Sto traducendo "${lessonTitle}" in azioni per **${context.artist.artistName}**. Niente copia-incolla: i task devono essere tuoi, specifici al tuo progetto.`
          : `Sto traducendo "${lessonTitle}" in azioni concrete per il tuo progetto.`,
        '',
        topics.length
          ? `**Concetti chiave dalla lezione**:\n${topics.map((t) => `- ${t}`).join('\n')}`
          : '**Concetti chiave**: (analisi non ancora generata per questa lezione — apri AI Processing per ottenerli).',
        '',
        practicalOutput
          ? `**Output pratico suggerito dalla lezione**: ${practicalOutput}`
          : '',
        '',
        '**3 task che ti propongo di inserire ora nel Kanban**. Personalizzali prima di salvarli — il coach non sa tutto del tuo progetto.',
      ]
        .filter(Boolean)
        .join('\n'),
    ),
    sourcesUsed: sources,
    suggestedTasks: [
      {
        title: `Applica "${lessonTitle}" — task 1`,
        description: topics[0]
          ? `Primo passo concreto per "${topics[0]}" nel tuo progetto. Descrivi cosa fai e quando è fatto.`
          : 'Primo passo operativo derivato dalla lezione.',
        priority: 'high',
        expectedOutput: 'Output concreto e verificabile (un file, una decisione scritta, un post pubblicato).',
        dueInDays: 3,
      },
      {
        title: `Applica "${lessonTitle}" — task 2`,
        description: topics[1]
          ? `Secondo passo concreto per "${topics[1]}".`
          : 'Secondo passo operativo derivato dalla lezione.',
        priority: 'medium',
        expectedOutput: 'Output concreto e verificabile.',
        dueInDays: 5,
      },
      {
        title: `Applica "${lessonTitle}" — task 3`,
        description: topics[2]
          ? `Terzo passo concreto per "${topics[2]}".`
          : 'Terzo passo operativo derivato dalla lezione.',
        priority: 'medium',
        expectedOutput: 'Output concreto e verificabile.',
        dueInDays: 7,
      },
    ],
  };
}

function thisWeek(context: CoachContext): CoachResponse {
  const open = context.tasks.filter(
    (t) => t.status === 'todo' || t.status === 'in_progress',
  );
  const blocked = context.tasks.filter((t) => t.status === 'blocked');
  const today = todayString();

  let focus: string;
  if (context.artist?.mainGoal) {
    focus = `Il tuo obiettivo registrato: **${context.artist.mainGoal}**. Tutto ciò che non si collega a questo, questa settimana, NON è prioritario.`;
  } else {
    focus = 'Non hai ancora definito un obiettivo principale. Questo è il primo task della settimana — senza, stai solo reagendo.';
  }

  const blockedCallout = blocked.length
    ? `\n\n⚠ Hai **${blocked.length} task bloccati**. Un blocco che dura più di 5 giorni non è più un blocco: è una decisione che stai evitando. Affrontiamolo.\n`
    : '';

  return {
    promptId: 'this-week',
    title: 'Settimana in 3 task',
    body: withFrame(
      `Settimana del ${today}`,
      [
        focus,
        blockedCallout,
        '### I 3 task da chiudere entro venerdì',
        '',
        open.length === 0
          ? '- (nessun task aperto — definiamone uno prima di chiudere la settimana)'
          : open
              .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))
              .slice(0, 3)
              .map(
                (t, i) =>
                  `${i + 1}. **${t.title}** — priorità ${t.priority}${
                    t.dueDate ? `, entro ${new Date(t.dueDate).toLocaleDateString()}` : ''
                  }`,
              )
              .join('\n'),
        '',
        '### Come lavori questa settimana',
        '- Lun/Mar: task 1 (alto sforzo).',
        '- Mer/Gio: task 2 + 30 min di review di metà settimana.',
        '- Ven: task 3 + chiusura settimana + call prep.',
        '',
        '### Fine settimana',
        'Cancella i task obsoleti, promuovi i bloccati a decisioni, salva 1 nota su cosa hai imparato.',
      ].join('\n'),
    ),
    sourcesUsed: context.artist ? ['ArtistProfile', 'Task'] : ['Task'],
    suggestedTasks: [],
  };
}

function callPrepBrief(context: CoachContext): CoachResponse {
  const date = context.nextCallAt
    ? new Date(context.nextCallAt).toLocaleDateString('it-IT')
    : 'non ancora fissata';

  return {
    promptId: 'call-prep',
    title: 'Brief di call',
    body: withFrame(
      `Prossima call: ${date}`,
      [
        'Una call è inutile se ci arrivi con la testa vuota. Ecco cosa porti in call.',
        '',
        '### Cosa porti',
        '',
        '**1. Lo stato reale, non quello che vorresti fosse.**',
        `- Task aperti: ${context.tasks.filter((t) => t.status !== 'done').length}`,
        `- Task bloccati: ${context.blockedTaskCount}`,
        `- Task totali: ${context.tasks.length}`,
        '',
        '**2. La singola decisione che ti sta bloccando.**',
        context.artist?.biggestBlock
          ? `Hai registrato questo come blocco principale: "${context.artist.biggestBlock}". È ancora valido?`
          : 'Non hai ancora registrato un blocco principale. Senza, la call diventa un debrief, non una sessione di lavoro.',
        '',
        '**3. Tre domande specifiche al coach umano.**',
        '- Cosa NON funziona nel modo in cui sto affrontando [X]?',
        '- Su cosa devo essere più duro con me stesso?',
        '- Qual è il prossimo passo non-evidente?',
        '',
        'Apri la pagina **Call Prep** per generare il report Markdown completo.',
      ].join('\n'),
    ),
    sourcesUsed: context.artist ? ['ArtistProfile', 'Task'] : ['Task'],
    suggestedTasks: [
      {
        title: 'Prepara 3 domande per la call',
        description: 'Tre domande specifiche, non retoriche. Se non hai domande, la call non ti serve.',
        priority: 'high',
        expectedOutput: 'Lista di 3 domande scritte, condivisibili con il coach.',
        dueInDays: 1,
      },
    ],
  };
}

function unblockAnalysis(context: CoachContext): CoachResponse {
  const block = context.artist?.biggestBlock;
  const blockedTasks = context.tasks.filter((t) => t.status === 'blocked');

  return {
    promptId: 'unblock',
    title: 'Analisi del blocco',
    body: withFrame(
      'Cosa ti sta davvero fermando',
      [
        block
          ? `Il blocco che hai registrato: **"${block}"**. Ora lo sezioniamo.`
          : 'Non hai ancora registrato un blocco. Senza questo dato, qualsiasi consiglio è generico. **Prima task: scrivi in una frase cosa ti sta fermando.**',
        '',
        blockedTasks.length
          ? `### Task bloccati aperti (${blockedTasks.length})`
          : '### Nessun task bloccato formalmente.',
        blockedTasks
          .map((t) => `- ${t.title}`)
          .join('\n'),
        '',
        '### Le 3 ipotesi sul tuo blocco',
        '1. **Ipotesi informativa**: "Non so cosa fare." — Test: hai scritto in 5 righe cosa vuoi ottenere? Se no, è questo.',
        '2. **Ipotesi di skill**: "So cosa fare ma non come." — Test: c\'è un esempio concreto di chi l\'ha già fatto? Se no, il problema è trovare l\'esempio, non fare l\'azione.',
        '3. **Ipotesi emotiva**: "Lo evito perché mi spaventa." — Test: se fosse facile, lo faresti? Se sì, è questo.',
        '',
        '### Azione minima per le prossime 24 ore',
        'Scrivi UNA riga per ciascuna ipotesi. Porta le risposte al coach, portale al prossimo task, portale dove vuoi — ma tirale fuori.',
      ].join('\n'),
    ),
    sourcesUsed: context.artist ? ['ArtistProfile', 'Task'] : ['Task'],
    suggestedTasks: [
      {
        title: 'Scrivi 1 frase sul blocco',
        description: 'Cosa ti sta fermando, in una sola frase onesta.',
        priority: 'urgent',
        expectedOutput: 'Una frase scritta e condivisa.',
        dueInDays: 1,
      },
    ],
  };
}

function plan7Days(context: CoachContext): CoachResponse {
  return {
    promptId: 'plan-7',
    title: 'Piano 7 giorni',
    body: withFrame(
      'Una settimana, niente di più',
      [
        context.artist?.mainGoal
          ? `Obiettivo di riferimento: **${context.artist.mainGoal}**`
          : 'Nessun obiettivo registrato: il primo giorno è dedicato a fissarlo.',
        '',
        `### Giorno 1 (${daysFromNow(0)})`,
        '- Definisci (o rivedi) il posizionamento in una frase.',
        '- Scegli UNA priorità della settimana. Non due. Una.',
        '',
        `### Giorno 2 (${daysFromNow(1)})`,
        '- Lavora sulla priorità per almeno 90 minuti senza distrazioni.',
        '',
        `### Giorno 3 (${daysFromNow(2)})`,
        '- Output concreto: scrivi, registra, pubblica una bozza.',
        '',
        `### Giorno 4 (${daysFromNow(3)})`,
        '- Review di metà settimana: cosa funziona? cosa no?',
        '',
        `### Giorno 5 (${daysFromNow(4)})`,
        '- Applica la priorità in pubblico (anche un post, anche piccolo).',
        '',
        `### Giorno 6 (${daysFromNow(5)})`,
        '- Riposo strategico: niente output, una nota su cosa hai imparato.',
        '',
        `### Giorno 7 (${daysFromNow(6)})`,
        '- Call prep + chiusura settimana. Pulisci il Kanban.',
      ].join('\n'),
    ),
    sourcesUsed: context.artist ? ['ArtistProfile'] : [],
    suggestedTasks: [
      {
        title: 'Piano 7 giorni — Giorno 1',
        description: 'Definisci posizionamento + priorità settimanale.',
        priority: 'high',
        expectedOutput: '1 frase di posizionamento + 1 priorità scritta.',
        dueInDays: 0,
      },
    ],
  };
}

function plan30Days(context: CoachContext): CoachResponse {
  return {
    promptId: 'plan-30',
    title: 'Piano 30 giorni',
    body: withFrame(
      'Una roadmap mensile',
      [
        context.artist?.mainGoal
          ? `Verso: **${context.artist.mainGoal}**.`
          : 'Obiettivo non ancora registrato. Il piano parte da qui.',
        '',
        '### Settimana 1 — Fondamenta',
        '- Posizionamento in una frase.',
        '- Audit asset esistenti (cover, bio, foto).',
        '- Identifica il blocco principale.',
        '',
        '### Settimana 2 — Asset prioritario',
        '- Scegli UN asset da rifare applicando il posizionamento.',
        '- Pubblica/rendi visibile la nuova versione.',
        '',
        '### Settimana 3 — Distribuzione',
        '- Allineamento con il prossimo rilascio/comunicazione.',
        '- Test del messaggio con 3 persone esterne.',
        '',
        '### Settimana 4 — Misura e itera',
        '- Cosa ha funzionato? Cosa no?',
        '- Aggiorna posizionamento se necessario.',
        '- Prepara il piano del mese successivo.',
        '',
        '### KPI minimi',
        '- 1 frase di posizionamento approvata.',
        '- 1 asset nuovo pubblicato.',
        '- 3 conversazioni con persone del pubblico.',
        '- 1 decisione difficile presa.',
      ].join('\n'),
    ),
    sourcesUsed: context.artist ? ['ArtistProfile'] : [],
    suggestedTasks: [
      {
        title: 'Piano 30 giorni — Settimana 1',
        description: 'Posizionamento + audit asset + blocco principale.',
        priority: 'high',
        expectedOutput: '3 deliverable settimanali.',
        dueInDays: 7,
      },
    ],
  };
}

function applyToArtist(context: CoachContext): CoachResponse {
  const slug = context.lessonSlug;
  const lesson = context.lesson;
  const analysis = context.lessonAnalysis ?? null;

  return {
    promptId: 'apply-to-artist',
    title: `Applica al tuo artista`,
    body: withFrame(
      'Da framework ad azione specifica',
      [
        lesson
          ? `Lezione di riferimento: **${lesson.title}**.`
          : 'Seleziona una lezione dal Catalogo per personalizzare la risposta.',
        '',
        context.artist
          ? `Artista attivo: **${context.artist.artistName}** (${artistTagline(context.artist)}).`
          : 'Per ora lavori senza un artista attivo: la traduzione resta generica.',
        '',
        '### Come applicarlo',
        analysis?.practicalOutput
          ? `Output pratico suggerito dalla lezione: ${analysis.practicalOutput}\n\nTraducilo per il tuo caso specifico: cosa diventa concreto per *questo* artista, *questa* settimana?`
          : 'Apri l\'analisi della lezione per estrarre l\'output pratico da personalizzare.',
        '',
        '### Quello che il manager deve fare ORA',
        '1. Scegli un artista specifico del roster. Mai "in generale".',
        '2. Apri il suo profilo / la sua scheda manager.',
        '3. Crea 1 task operativo basato sull\'output pratico della lezione.',
        '4. Assegna priorità alta se il task è bloccante per il prossimo rilascio.',
      ].join('\n'),
    ),
    sourcesUsed: analysis ? ['lesson-analysis.json'] : [],
    suggestedTasks: [
      {
        title: 'Crea 1 task operativo dall\'analisi',
        description: 'Traduci l\'output della lezione in un task per l\'artista.',
        priority: 'high',
        expectedOutput: 'Task creato nel Kanban, collegato alla lezione di riferimento.',
        dueInDays: 2,
      },
    ],
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

// ---------------------------------------------------------------------------
// Release Growth System — 5 prompt
// ---------------------------------------------------------------------------

function releasePlan(context: CoachContext): CoachResponse {
  const releases = context.releases ?? [];
  const active =
    releases.find((r) => r.status === 'planning' || r.status === 'pre_release') ??
    releases[0] ??
    null;

  if (!active) {
    return {
      promptId: 'release-plan',
      title: 'Piano di lancio',
      body: withFrame(
        'Nessuna release attiva',
        [
          'Non c\'è ancora una release da pianificare.',
          '',
          '**Prossima azione**: apri la pagina *Prossime uscite* e crea la prima release (singolo, EP, album, videoclip o campagna).',
          '',
          'Dopo averla creata, torna qui e il coach ti preparerà 3 milestone + 5 contenuti + 3 outreach + 1 metrica da guardare, basandosi sullo stato reale della tua release.',
        ].join('\n'),
      ),
      sourcesUsed: ['Release'],
      suggestedTasks: [],
    };
  }

  const openMs = active.milestones.filter((m) => m.status !== 'done');
  const plannedContent = active.contentIdeas.filter(
    (c) => c.status === 'idea' || c.status === 'draft' || c.status === 'approved',
  );
  const outreach = active.outreach.filter(
    (o) => o.status === 'to_contact' || o.status === 'contacted',
  );
  const releaseDate = active.releaseDate
    ? new Date(active.releaseDate).toLocaleDateString('it-IT')
    : 'non fissata';

  return {
    promptId: 'release-plan',
    title: `Piano di lancio: ${active.title}`,
    body: withFrame(
      `Release: ${active.title}`,
      [
        `Tipo: ${active.type} · Stato: ${active.status} · Uscita: ${releaseDate}`,
        active.mainGoal ? `\n**Obiettivo principale:** ${active.mainGoal}` : '',
        '',
        '### Diagnosi stato release',
        `- Milestone aperte: ${openMs.length} su ${active.milestones.length}`,
        `- Contenuti pianificati: ${plannedContent.length}`,
        `- Outreach pendenti: ${outreach.length}`,
        `- Goal attivi: ${active.goals.filter((g) => g.status === 'active').length}`,
        '',
        '### 3 milestone da chiudere prima dell\'uscita',
        openMs.length
          ? openMs
              .slice(0, 3)
              .map(
                (m, i) =>
                  `${i + 1}. **${m.title}** — priorità ${m.priority}${
                    m.dueDate
                      ? `, entro ${new Date(m.dueDate).toLocaleDateString('it-IT')}`
                      : ''
                  }`,
              )
              .join('\n')
          : '— Nessuna milestone aperta, aggiungine 3 ora.',
        '',
        '### 5 contenuti consigliati per le prossime 2 settimane',
        plannedContent.length >= 5
          ? plannedContent
              .slice(0, 5)
              .map((c) => `- [${c.platform}/${c.format}] ${c.title}`)
              .join('\n')
          : [
              '- [instagram/reel] Story time: il momento in cui hai scritto il ritornello',
              '- [tiktok/short] 30 sec del drop migliore + caption che genera curiosità',
              '- [instagram/carousel] 5 slide dietro le quinte della produzione',
              '- [newsletter/email] Annuncio ufficiale con data e pre-save',
              '- [tiktok/live] Mini-live di 15 min prima dell\'uscita',
            ].join('\n'),
        '',
        '### 3 outreach da fare ora',
        outreach.length
          ? outreach
              .slice(0, 3)
              .map((o) => `- [${o.channel}] ${o.contactName}`)
              .join('\n')
          : [
              '- [instagram] 3 playlist curator del tuo genere',
              '- [email] 2 venue che ospitano artisti simili al tuo',
              '- [instagram] 1 giornalista/blog che ha parlato di artisti vicini',
            ].join('\n'),
        '',
        '### 1 metrica da guardare questa settimana',
        active.goals[0]
          ? `**${active.goals[0].title}** (${active.goals[0].currentValue}/${active.goals[0].targetValue} ${active.goals[0].metric}). Una sola. Non guardare le altre.`
          : 'Definisci un numero: "100 fan email entro 30 giorni" è più utile di "crescere".',
      ]
        .filter(Boolean)
        .join('\n'),
    ),
    sourcesUsed: ['Release', 'ReleaseMilestone', 'ContentIdea', 'Outreach', 'Goal'],
    suggestedTasks: openMs.slice(0, 3).map((m, i) => ({
      title: `Release "${active.title}" — ${m.title}`,
      description: `Porta avanti la milestone "${m.title}" prima dell'uscita del ${releaseDate}.`,
      priority: (i === 0 ? 'urgent' : 'high') as 'urgent' | 'high',
      expectedOutput: 'Milestone status = done.',
      dueInDays: m.dueDate
        ? Math.max(1, Math.round((new Date(m.dueDate).getTime() - Date.now()) / 86400000))
        : 3 + i * 2,
    })),
  };
}

function contentWeek(context: CoachContext): CoachResponse {
  const ideas = context.contentIdeas ?? [];
  const upcoming = ideas.filter(
    (i) =>
      i.status === 'idea' || i.status === 'draft' || i.status === 'approved' || i.status === 'scheduled',
  );

  const fallbackIdeas = upcoming.length < 5
    ? [
        {
          id: 'fb-1',
          title: 'Story time: il momento in cui hai scritto il ritornello',
          platform: 'instagram',
          format: 'reel',
          status: 'idea',
          publishAt: null,
        },
        {
          id: 'fb-2',
          title: '30 sec del drop migliore + caption che genera curiosità',
          platform: 'tiktok',
          format: 'short',
          status: 'idea',
          publishAt: null,
        },
        {
          id: 'fb-3',
          title: '5 slide dietro le quinte della produzione',
          platform: 'instagram',
          format: 'carousel',
          status: 'idea',
          publishAt: null,
        },
        {
          id: 'fb-4',
          title: 'Annuncio ufficiale con data e pre-save',
          platform: 'newsletter',
          format: 'email',
          status: 'idea',
          publishAt: null,
        },
        {
          id: 'fb-5',
          title: 'Mini-live di 15 min prima dell\'uscita',
          platform: 'tiktok',
          format: 'live',
          status: 'idea',
          publishAt: null,
        },
      ]
    : [];

  const five = [...upcoming, ...fallbackIdeas].slice(0, 5);

  return {
    promptId: 'content-week',
    title: 'Cosa pubblichiamo questa settimana',
    body: withFrame(
      '5 contenuti per la settimana',
      [
        'Niente di generico. Ogni contenuto è un\'azione specifica con piattaforma, hook e CTA.',
        '',
        ...five.flatMap((c, i) => [
          `### ${i + 1}. ${c.title}`,
          `- **Piattaforma**: ${c.platform} · **Formato**: ${c.format}`,
          `- **Hook**: prima riga che aggancia — non spiegare, incuriosisci.`,
          `- **CTA**: cosa vuoi che faccia chi guarda? (segui, salva, commenta, pre-save).`,
          `- **Quando**: scegli un giorno specifico, non "questa settimana".`,
          '',
        ]),
        '### Regola della settimana',
        'Meglio 3 contenuti fatti bene che 5 buttati. Se devi tagliarne, taglia: la qualità si vede, la quantità no.',
      ].join('\n'),
    ),
    sourcesUsed: ['ContentIdea'],
    suggestedTasks: five.slice(0, 3).map((c, i) => ({
      title: `Prepara contenuto: ${c.title}`,
      description: `Scrivi hook + CTA + caption. Pubblica su ${c.platform}/${c.format}.`,
      priority: i === 0 ? 'high' : 'medium',
      expectedOutput: 'Contenuto pubblicato con link al post.',
      dueInDays: 2 + i * 2,
    })),
  };
}

function metricsReview(context: CoachContext): CoachResponse {
  const metrics = context.metrics ?? [];
  const goals = context.goals ?? [];

  const byPlatform: Record<string, typeof metrics> = {};
  for (const m of metrics) {
    if (!byPlatform[m.platform]) byPlatform[m.platform] = [];
    byPlatform[m.platform].push(m);
  }

  const growing: string[] = [];
  const flat: string[] = [];
  for (const [plat, list] of Object.entries(byPlatform)) {
    const sorted = [...list].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const latest = sorted[0];
    const previous = sorted[1];
    if (!latest) continue;
    const fields = [
      { key: 'followers', label: 'follower' },
      { key: 'streams', label: 'stream' },
      { key: 'views', label: 'views' },
      { key: 'linkClicks', label: 'link clicks' },
    ] as const;
    for (const f of fields) {
      const cur = (latest as any)[f.key];
      const prev = previous ? (previous as any)[f.key] : null;
      if (cur == null) continue;
      if (prev != null && cur > prev) {
        growing.push(`${plat} ${f.label}: ${prev} → ${cur}`);
      } else if (prev != null && cur === prev) {
        flat.push(`${plat} ${f.label}: fermo a ${cur}`);
      }
    }
  }

  return {
    promptId: 'metrics-review',
    title: 'Analisi dei numeri',
    body: withFrame(
      'Cosa sta succedendo davvero',
      [
        goals.length === 0 && metrics.length === 0
          ? 'Non hai ancora snapshot metriche né obiettivi misurabili. Senza numeri, stai lavorando a sensazione.\n\n**Prossima azione**: apri *Numeri* e inserisci il primo snapshot. Poi apri *Obiettivi* e definiscine uno con target + deadline.'
          : '',
        growing.length
          ? `### Cosa sta crescendo\n${growing.map((g) => `- ${g}`).join('\n')}`
          : '### Cosa sta crescendo\n— Nessun dato di crescita ancora. Aggiungi uno snapshot.',
        flat.length
          ? `\n### Cosa è fermo\n${flat.map((f) => `- ${f}`).join('\n')}`
          : '\n### Cosa è fermo\n— Nessun dato "piatto" rilevato.',
        goals.length
          ? `\n### Goal attivi\n${goals
              .filter((g) => g.status === 'active')
              .map((g) => {
                const pct = g.targetValue > 0
                  ? Math.round((g.currentValue / g.targetValue) * 100)
                  : 0;
                return `- ${g.title}: ${g.currentValue}/${g.targetValue} ${g.metric} (${pct}%)${
                  g.deadline ? `, entro ${new Date(g.deadline).toLocaleDateString('it-IT')}` : ''
                }`;
              })
              .join('\n')}`
          : '',
        '\n### Cosa testare questa settimana',
        '- Un contenuto in più su una piattaforma dove stai crescendo (raddoppia, non disperdere).',
        '- Una sola modifica al messaggio/CTA principale (non 5).',
        '- Un\'azione di outreach mirata (1 contatto curato batte 10 a caso).',
        '\n### Metrica singola da guardare',
        goals[0]
          ? `**${goals[0].title}** — è la metrica che decide se stai crescendo o meno. Tutto il resto è contorno.`
          : 'Scegli una metrica e guardala SOLO per 7 giorni. Resisti alla tentazione di controllare tutto.',
      ]
        .filter(Boolean)
        .join('\n'),
    ),
    sourcesUsed: ['MetricSnapshot', 'Goal'],
    suggestedTasks: [
      {
        title: 'Snapshot metriche di fine settimana',
        description: 'Inserisci i numeri reali di venerdì su tutte le piattaforme attive.',
        priority: 'medium',
        expectedOutput: 'Snapshot salvato per ogni piattaforma.',
        dueInDays: 3,
      },
    ],
  };
}

function outreachPlan(context: CoachContext): CoachResponse {
  const outreach = context.outreach ?? [];
  const due = outreach.filter((o) => {
    if (o.status === 'closed' || o.status === 'rejected') return false;
    if (!o.nextFollowUpAt) return o.status === 'to_contact';
    return new Date(o.nextFollowUpAt) <= new Date();
  });

  return {
    promptId: 'outreach-plan',
    title: 'Chi contattare ora',
    body: withFrame(
      'Outreach di questa settimana',
      [
        due.length
          ? `### Follow-up in scadenza\n${due
              .slice(0, 5)
              .map((o) => `- [${o.status}] **${o.contactName}** (${o.channel})${
                o.nextFollowUpAt
                  ? ` — follow-up ${new Date(o.nextFollowUpAt).toLocaleDateString('it-IT')}`
                  : ''
              }`)
              .join('\n')}`
          : '### Nessun follow-up scaduto. Bene.',
        '',
        '### Categorie da aprire (se non ce l\'hai)',
        '- 3 playlist curator del tuo genere (Instagram o email)',
        '- 2 venue che ospitano artisti simili al tuo',
        '- 1 giornalista o blog che ha parlato di artisti vicini',
        '- 3 creator che fanno reel/scritti su musica del tuo genere',
        '',
        '### Messaggio base (adatta in base al canale)',
        '> Ciao [nome], ascolto [riferimento specifico a qualcosa che hanno fatto/pubblicato]. Sto lavorando a [release], ti mando un link in anteprima se ti interessa. Senza pressione.',
        '',
        '### Regola outreach',
        '1 contatto curato al giorno batte 10 DM a raffica. Se non riesci a personalizzare, non mandare.',
      ].join('\n'),
    ),
    sourcesUsed: ['Outreach', 'Contact'],
    suggestedTasks: due.slice(0, 3).map((o) => ({
      title: `Follow-up: ${o.contactName}`,
      description: `Scrivi il messaggio, salva la risposta o imposta il prossimo follow-up. Canale: ${o.channel}.`,
      priority: 'high',
      expectedOutput: 'Risposta registrata o nuovo follow-up fissato.',
      dueInDays: 2,
    })),
  };
}

function goalCheck(context: CoachContext): CoachResponse {
  const goals = context.goals ?? [];
  const active = goals.filter((g) => g.status === 'active');

  if (active.length === 0) {
    return {
      promptId: 'goal-check',
      title: 'Stato obiettivi',
      body: withFrame(
        'Nessun obiettivo attivo',
        [
          'Senza obiettivi misurabili, "crescere" è una parola vuota.',
          '',
          '**Prossima azione**: apri *Obiettivi* e creane uno. Esempi:',
          '- 100 fan email entro 30 giorni',
          '- 1.000 stream mensili su Spotify entro 60 giorni',
          '- 5 contatti curator che rispondono entro 14 giorni',
          '- 500 follower Instagram entro 30 giorni',
        ].join('\n'),
      ),
      sourcesUsed: ['Goal'],
      suggestedTasks: [],
    };
  }

  const lines = active.map((g) => {
    const pct = g.targetValue > 0
      ? Math.round((g.currentValue / g.targetValue) * 100)
      : 0;
    const remaining = Math.max(0, g.targetValue - g.currentValue);
    const deadline = g.deadline ? new Date(g.deadline) : null;
    const daysLeft = deadline
      ? Math.round((deadline.getTime() - Date.now()) / 86400000)
      : null;
    let risk: 'on_track' | 'at_risk' | 'off_track' | 'unknown' = 'unknown';
    if (daysLeft != null && daysLeft > 0) {
      const ratio = pct / 100;
      const timeRatio = 1 - daysLeft / 30; // very rough: 30-day window
      if (ratio >= timeRatio) risk = 'on_track';
      else if (ratio >= timeRatio * 0.5) risk = 'at_risk';
      else risk = 'off_track';
    }
    const riskLabel = {
      on_track: 'in linea',
      at_risk: 'a rischio',
      off_track: 'fuori strada',
      unknown: 'da valutare',
    }[risk];
    return `- **${g.title}**: ${g.currentValue}/${g.targetValue} ${g.metric} (${pct}%) — ${riskLabel}${
      deadline ? ` · scadenza ${deadline.toLocaleDateString('it-IT')}` : ''
    } · mancano ${remaining} ${g.metric}`;
  });

  return {
    promptId: 'goal-check',
    title: 'Stato obiettivi',
    body: withFrame(
      'Dove sei rispetto a dove vuoi essere',
      [
        ...lines,
        '',
        '### Prossima azione singola',
        active.length
          ? `Lavora sull'obiettivo "${active[0].title}" — è il primo, il più urgente, quello che decide se la settimana è stata buona o no.`
          : 'Definisci il primo obiettivo.',
        '',
        '### Ricorda',
        'Un goal al 50% a metà percorso è in salute. Un goal al 20% a metà percorso è in pericolo: o cambi strategia, o cambi il goal. Non mentire a te stesso sui numeri.',
      ].join('\n'),
    ),
    sourcesUsed: ['Goal'],
    suggestedTasks: [
      {
        title: 'Aggiorna i numeri degli obiettivi attivi',
        description: 'Inserisci i valori reali di oggi per ogni goal attivo.',
        priority: 'high',
        expectedOutput: 'Valori currentValue aggiornati.',
        dueInDays: 1,
      },
    ],
  };
}
