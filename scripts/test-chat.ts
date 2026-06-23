/**
 * Smoke test for /api/coach/chat.
 *
 * Posts 3 hard-coded queries and asserts:
 *   - HTTP 200
 *   - reply length > 50 chars
 *   - sources[] contains the expected slug
 *   - reply mentions [fonte: <slug>] inline tag
 *
 * Usage:
 *   npm run dev               # in shell 1
 *   npm run test:chat         # in shell 2
 *
 *   or against the live Render URL:
 *   WAVE_UP_BASE=https://wave-up.onrender.com npm run test:chat
 */

const BASE = process.env.WAVE_UP_BASE ?? 'http://localhost:3000';

const QUERIES: { q: string; expectSlug: string; expectLabelPart: string }[] = [
  {
    q: 'come faccio pitch per le playlist',
    expectSlug: 'modulo-4-2-spotify-e-playlisting-updated',
    expectLabelPart: 'Spotify',
  },
  {
    q: 'spiegami la differenza tra reel e tiktok per un artista',
    expectSlug: 'modulo-6-contenuti-and-social-updated',
    expectLabelPart: 'Contenuti',
  },
  {
    q: 'quali sono le fonti di guadagno per un musicista emergente',
    expectSlug: 'modulo-9-fonti-di-guadagno-e-come-usarle-new',
    expectLabelPart: 'Guadagno',
  },
];

async function run() {
  console.log(`\n[test-chat] base: ${BASE}\n`);
  let pass = 0;
  let fail = 0;

  for (const { q, expectSlug, expectLabelPart } of QUERIES) {
    const sessionId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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
      console.error(`  ✗ network error:`, err);
      fail++;
      continue;
    }

    const elapsed = Date.now() - start;
    const ok = status === 200 && json.ok === true;
    const replyOk = typeof json.reply === 'string' && json.reply.length > 50;
    const sources: string[] = Array.isArray(json.sources) ? json.sources : [];
    const hasSlug = sources.includes(expectSlug);
    const hasInlineTag = typeof json.reply === 'string' &&
      json.reply.toLowerCase().includes(`[fonte: ${expectSlug}]`);
    const mentionsLabel =
      typeof json.reply === 'string' &&
      json.reply.toLowerCase().includes(expectLabelPart.toLowerCase());

    const allGood = ok && replyOk && hasSlug && hasInlineTag;

    console.log(
      `Q: "${q}"\n` +
        `  HTTP ${status}, ${elapsed}ms\n` +
        `  reply chars: ${json.reply?.length ?? 0} ${replyOk ? '✓' : '✗'}\n` +
        `  sources: ${JSON.stringify(sources)} ${hasSlug ? '✓' : '✗ (missing ${expectSlug})'}\n` +
        `  inline tag [fonte: ${expectSlug}]: ${hasInlineTag ? '✓' : '✗'}\n` +
        `  mentions "${expectLabelPart}": ${mentionsLabel ? '✓' : '– (not required)'}\n` +
        `  ${allGood ? '✓ PASS' : '✗ FAIL'}`,
    );
    if (allGood) pass++;
    else fail++;
  }

  console.log(`\n[test-chat] ${pass} pass, ${fail} fail\n`);
  if (fail > 0) process.exit(1);
}

run().catch((err) => {
  console.error('[test-chat] fatal:', err);
  process.exit(1);
});

export {};
