/**
 * Unit tests for buildSystemPrompt.
 *
 * Asserts the prompt structure under the three growthBlock / growthDataAvailable
 * combinations the chat route actually produces. No DB, no model — pure
 * function tests so refactors of the prompt builder are caught immediately.
 *
 * Usage:  npx tsx scripts/test-prompts.ts
 */

import { buildSystemPrompt } from '../lib/chat/prompts';
import { course } from '../lib/course';

const FAKE_CORPUS = '## Lezione 1 — Test\nSlug: test-slug\n[fonte: test-slug]\n...';

interface Check {
  label: string;
  ok: boolean;
}

function runChecks(label: string, checks: Check[]): boolean {
  console.log(`\n[${label}]`);
  let pass = 0;
  let fail = 0;
  for (const c of checks) {
    console.log(`  ${c.ok ? '✓' : '✗'} ${c.label}`);
    if (c.ok) pass++;
    else fail++;
  }
  console.log(`  ${pass} pass, ${fail} fail`);
  return fail === 0;
}

function check(prompt: string, needle: string): Check {
  return { label: needle, ok: prompt.includes(needle) };
}

async function main(): Promise<void> {
  const validSlugs = course.lessons.map((l) => l.slug).join(', ');

  // ── Case 1: no artist, no growth data ────────────────────────────────
  const c1 = buildSystemPrompt(FAKE_CORPUS, {});
  const r1 = runChecks('case 1: no artist', [
    check(c1, 'Sei il coach AI'),
    check(c1, 'Nessun profilo artista attivo'),
    check(c1, FAKE_CORPUS),
    { label: 'no "Contesto growth" section', ok: !c1.includes('Contesto growth') },
    check(c1, validSlugs),
    check(c1, '[fonte: <slug-lezione>]'),
  ]);

  // ── Case 2: artist + growth data ────────────────────────────────────
  const c2 = buildSystemPrompt(FAKE_CORPUS, {
    artistName: 'Luna Rossa',
    activeTaskCount: 3,
    blockedTaskCount: 1,
    growthBlock: '## Release attiva\n- Titolo: Notte Storta\n...',
    growthDataAvailable: true,
  });
  const r2 = runChecks('case 2: artist + growth data', [
    check(c2, '"Luna Rossa"'),
    check(c2, 'task aperti: 3, bloccati: 1'),
    check(c2, 'Contesto growth'),
    check(c2, 'PRIORITARIO'),
    check(c2, 'Notte Storta'),
    check(c2, 'NON richiedono tag di fonte'),
  ]);

  // ── Case 3: artist exists, NO growth data ────────────────────────────
  const c3 = buildSystemPrompt(FAKE_CORPUS, {
    artistName: 'Luna Rossa',
    growthBlock: null,
    growthDataAvailable: false,
  });
  const r3 = runChecks('case 3: artist without growth data', [
    check(c3, '"Luna Rossa"'),
    check(c3, 'MANCANTE'),
    check(c3, 'Non hai ancora abbastanza dati. Crea una release / goal / metric snapshot.'),
    check(c3, 'ESATTAMENTE con:'),
    check(c3, FAKE_CORPUS),
  ]);

  const allPass = r1 && r2 && r3;
  console.log(`\n[test-prompts] ${allPass ? 'ALL PASS' : 'FAILED'}`);
  if (!allPass) process.exit(1);
}

main().catch((err: unknown) => {
  console.error('[test-prompts] fatal:', err);
  process.exit(1);
});

export {};
