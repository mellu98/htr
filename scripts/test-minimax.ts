/**
 * Smoke test for the MiniMax wiring.
 *
 * Verifies that:
 *   1. The key + model + base URL resolve from env.
 *   2. The real chat-completions endpoint is reachable.
 *   3. The model returns Italian content (the project's lingua franca).
 *   4. JSON mode works (response_format: { type: "json_object" }).
 *
 * Usage:
 *   npm run test:minimax
 *   # or
 *   MINIMAX_API_KEY=sk-... npm run test:minimax
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — env not configured (still useful: confirms the "no key → mock" path)
 *   2 — real call returned a string but failed an assertion
 *   3 — real call failed (network / 4xx / 5xx / parse error)
 */

import { callModel, getMiniMaxConfig, isMiniMaxConfigured } from '../lib/ai/minimax';

function mask(k: string | null): string {
  if (!k) return '(none)';
  if (k.length <= 10) return '***';
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

async function main() {
  const config = getMiniMaxConfig();
  console.log('─── MiniMax wiring smoke test ───');
  console.log(`  key:    ${mask(config.apiKey)}`);
  console.log(`  model:  ${config.model}`);
  console.log(`  base:   ${config.baseUrl}`);
  console.log();

  if (!isMiniMaxConfigured()) {
    console.log('✗ MINIMAX_API_KEY not set.');
    console.log('  Add it to your .env (gitignored) or pass it inline:');
    console.log('    MINIMAX_API_KEY=sk-... npm run test:minimax');
    console.log('  The app correctly falls back to mock output when no key is set.');
    process.exit(1);
  }

  // 1. Plain text round-trip
  console.log('1) Plain text round-trip…');
  let textReply: string | null;
  try {
    textReply = await callModel('Rispondi solo con la parola "ciao".', {
      temperature: 0,
    });
  } catch (err) {
    console.error('  ✗ call failed:', (err as Error).message);
    process.exit(3);
  }
  if (!textReply) {
    console.error('  ✗ no content returned');
    process.exit(3);
  }
  console.log(`  ✓ reply: ${JSON.stringify(textReply.slice(0, 200))}`);

  // 2. JSON mode round-trip
  console.log();
  console.log('2) JSON mode round-trip…');
  let jsonReply: string | null;
  try {
    jsonReply = await callModel(
      'Restituisci un JSON con due campi: "language"="italian" e "ok"=true. Solo JSON, niente testo extra.',
      { json: true, temperature: 0 },
    );
  } catch (err) {
    console.error('  ✗ call failed:', (err as Error).message);
    process.exit(3);
  }
  if (!jsonReply) {
    console.error('  ✗ no content returned');
    process.exit(3);
  }
  let parsed: { language?: string; ok?: boolean };
  try {
    parsed = JSON.parse(jsonReply);
  } catch (err) {
    console.error('  ✗ response was not valid JSON:', (err as Error).message);
    console.error('    body:', jsonReply.slice(0, 300));
    process.exit(2);
  }
  if (parsed.language !== 'italian' || parsed.ok !== true) {
    console.error('  ✗ JSON did not match expected shape:', parsed);
    process.exit(2);
  }
  console.log('  ✓ JSON parsed and shape matches:', parsed);

  // 3. Italian content check
  console.log();
  console.log('3) Italian content check…');
  const it = await callModel(
    'Scrivi una sola frase in italiano su cosa significa "posizionamento" per un artista musicale.',
    { temperature: 0.2 },
  );
  if (!it) {
    console.error('  ✗ no content');
    process.exit(3);
  }
  const hasItalianMarkers =
    /[àèéìòù]|posizionamento|artista|musicale|pubblico/i.test(it);
  if (!hasItalianMarkers) {
    console.error('  ✗ response does not look Italian:', it.slice(0, 200));
    process.exit(2);
  }
  console.log(`  ✓ looks Italian: ${it.slice(0, 140)}…`);

  console.log();
  console.log('All checks passed. ✓');
  process.exit(0);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(3);
});
