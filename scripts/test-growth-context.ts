/**
 * Smoke test for buildGrowthContextBlock().
 *
 * Runs against the same DB the dev server uses (DATABASE_URL from .env).
 * Verifies that the seeded Luna Rossa / Notte Storta dataset produces:
 *   - hasData = true
 *   - activeReleaseId is set
 *   - block contains the release title, next milestone, at least one
 *     content idea, at least one goal, at least one outreach, at least
 *     one metric snapshot
 *
 *   node --import tsx scripts/test-growth-context.ts
 *   or:  npx tsx scripts/test-growth-context.ts
 */

import { buildGrowthContextBlock } from '../lib/chat/growth-context';

async function main() {
  const ctx = await buildGrowthContextBlock();
  console.log('--- buildGrowthContextBlock() result ---');
  console.log('hasData:           ', ctx.hasData);
  console.log('activeReleaseId:   ', ctx.activeReleaseId);
  console.log('counts.openTasks:  ', ctx.counts.openTasks);
  console.log('counts.blockedTasks:', ctx.counts.blockedTasks);
  console.log('counts.contentIdeas:', ctx.counts.contentIdeas);
  console.log('counts.goals:      ', ctx.counts.goals);
  console.log('counts.outreach:   ', ctx.counts.outreach);
  console.log('counts.metrics:    ', ctx.counts.metrics);
  console.log();
  console.log('--- block ---');
  console.log(ctx.block);
  console.log();
  console.log('--- assertions ---');

  const checks: [string, boolean][] = [
    ['hasData === true', ctx.hasData === true],
    ['activeReleaseId is set', !!ctx.activeReleaseId],
    ['block contains "Release attiva"', ctx.block.includes('## Release attiva')],
    ['block contains "Notte Storta"', ctx.block.includes('Notte Storta')],
    ['block contains "Prossima milestone"', ctx.block.includes('Prossima milestone')],
    ['block contains "Contenuti da pubblicare"', ctx.block.includes('Contenuti da pubblicare')],
    ['block contains "Goal attivi"', ctx.block.includes('Goal attivi')],
    ['block contains "Outreach & follow-up"', ctx.block.includes('Outreach & follow-up')],
    ['block contains "Metriche più recenti"', ctx.block.includes('Metriche più recenti')],
  ];

  let pass = 0;
  let fail = 0;
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? '✓' : '✗'} ${label}`);
    if (ok) pass++; else fail++;
  }
  console.log(`\n[test-growth-context] ${pass} pass, ${fail} fail`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error('[test-growth-context] fatal:', err);
  process.exit(1);
});
