/**
 * E2E test: assert that the chat reply actually uses the artist's
 * Release Growth System data, not just the course corpus.
 *
 * Sends operational questions to /api/coach/chat and asserts the reply
 * contains real seeded data ("Notte Storta", a milestone title, an
 * outreach contact name, or a current metric value).
 *
 * Requires:
 *   - Dev server running on $WAVE_UP_BASE (default http://localhost:3000)
 *   - Database seeded with the Luna Rossa / Notte Storta demo dataset
 *     (npm run db:seed) so the assertions match real values
 *   - A real model key configured (MINIMAX_API_KEY or ANTHROPIC_AUTH_TOKEN),
 *     otherwise the route returns the offline fallback and these
 *     assertions can't pass.
 *
 * Usage:
 *   npm run dev               # in shell 1
 *   npx tsx scripts/test-chat-growth.ts   # in shell 2
 *   WAVE_UP_BASE=https://wave-up.onrender.com npx tsx scripts/test-chat-growth.ts
 */

const BASE = process.env.WAVE_UP_BASE ?? 'http://localhost:3000';

interface Query {
  q: string;
  expectAny: string[]; // reply must contain at least one of these substrings
  label: string;
}

const QUERIES: Query[] = [
  {
    label: 'operational: "a che punto siamo con la release?"',
    q: 'a che punto siamo con la release?',
    expectAny: ['Notte Storta', 'EP', 'pre_release', 'milestone', 'pitch'],
  },
  {
    label: 'operational: "cosa devo fare oggi?"',
    q: 'cosa devo fare oggi?',
    expectAny: [
      'Notte Storta',
      'cover',
      'Cover artwork',
      'pitch',
      'Pitch',
      'task',
      'Finalizzare',
      'Indie Urban',
    ],
  },
  {
    label: 'operational: "come procedono i numeri?"',
    q: 'come procedono i numeri?',
    expectAny: [
      'followers',
      'monthly',
      'stream',
      'view',
      'link click',
      // Seeded values:
      '1.180',
      '2.030',
      '2.400',
      '19.500',
    ],
  },
];

async function run() {
  console.log(`\n[test-chat-growth] base: ${BASE}\n`);
  let pass = 0;
  let fail = 0;

  for (const { q, expectAny, label } of QUERIES) {
    const sessionId = `tcg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const start = Date.now();
    let status = 0;
    let json: any = null;
    try {
      const res = await fetch(`${BASE}/api/coach/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: q, sessionId }),
      });
      status = res.status;
      json = await res.json();
    } catch (err) {
      console.error(`  ✗ network error for "${q}":`, err);
      fail++;
      continue;
    }

    const elapsed = Date.now() - start;
    const reply: string = json?.reply ?? '';
    const lower = reply.toLowerCase();
    const matched = expectAny.find((s) => lower.includes(s.toLowerCase()));
    const fallback = json?.fallback === true;
    const ok = status === 200 && json?.ok === true && !fallback && !!matched;

    console.log(
      `${label}\n` +
        `  Q: "${q}"\n` +
        `  HTTP ${status}, ${elapsed}ms${fallback ? '  (offline fallback!)' : ''}\n` +
        `  reply chars: ${reply.length}\n` +
        `  matched: ${matched ? `"${matched}"` : '— (none of ' + JSON.stringify(expectAny) + ')'}\n` +
        `  ${ok ? '✓ PASS' : '✗ FAIL'}`,
    );
    if (ok) pass++;
    else fail++;
  }

  console.log(`\n[test-chat-growth] ${pass} pass, ${fail} fail\n`);
  if (fail > 0) process.exit(1);
}

run().catch((err) => {
  console.error('[test-chat-growth] fatal:', err);
  process.exit(1);
});

export {};
