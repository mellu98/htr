/**
 * Tutor prompt catalogue — pure data only (no I/O).
 * Safe to import from client components.
 */

export type TutorPromptId =
  | 'summarize'
  | 'explain-to-artist'
  | 'create-exercise'
  | 'manager-actions'
  | 'key-points'
  | 'operational-script'
  | 'mistakes-to-avoid';

export interface TutorPrompt {
  id: TutorPromptId;
  label: string;
  description: string;
}

export const TUTOR_PROMPTS: TutorPrompt[] = [
  {
    id: 'summarize',
    label: 'Riassumi questa lezione',
    description: 'Restituisce un riassunto leggibile in 30 secondi.',
  },
  {
    id: 'explain-to-artist',
    label: 'Spiegala a un artista',
    description: 'Riscrivi i concetti chiave in linguaggio semplice.',
  },
  {
    id: 'create-exercise',
    label: 'Crea esercizio pratico',
    description: 'Un esercizio concreto da fare oggi basato sulla lezione.',
  },
  {
    id: 'manager-actions',
    label: 'Cosa deve fare il manager?',
    description: 'Le tre azioni manageriali da eseguire questa settimana.',
  },
  {
    id: 'key-points',
    label: 'Quali sono i punti chiave?',
    description: 'Bullet list dei concetti non negoziabili.',
  },
  {
    id: 'operational-script',
    label: 'Genera script operativo',
    description: 'Una sequenza di step operativi pronta da applicare.',
  },
  {
    id: 'mistakes-to-avoid',
    label: 'Trova errori da evitare',
    description: 'I 5 errori più comuni legati a questa lezione.',
  },
];
