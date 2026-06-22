import { postChat, isMiniMaxConfigured } from '@/lib/ai/minimax';

/**
 * Free-form chat wrapper around `postChat()`.
 *
 * Builds the messages array [system, ...history, user], calls M3 with
 * chat-completions defaults (temperature 0.4, max 1500 tokens), and
 * post-processes the reply to extract inline `[fonte: <slug>]` markers
 * into a deduplicated `sources: string[]` array.
 *
 * Returns `null` when the API key isn't configured (so the route can
 * fall back to a friendly offline message).
 */

const SOURCE_REGEX = /\[fonte:\s*([a-z0-9-]+)\]/gi;

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  reply: string;
  sources: string[];
}

export async function sendChat(
  systemPrompt: string,
  history: ChatTurn[],
  userMessage: string,
): Promise<ChatResult | null> {
  if (!isMiniMaxConfigured()) return null;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: 'user' as const, content: userMessage },
  ];

  const raw = await postChat(messages, {
    temperature: 0.4,
    maxTokens: 1500,
  });

  const sources = Array.from(
    new Set(
      Array.from(raw.matchAll(SOURCE_REGEX))
        .map((m) => (m[1] ?? '').trim())
        .filter(Boolean),
    ),
  );

  return { reply: raw, sources };
}
