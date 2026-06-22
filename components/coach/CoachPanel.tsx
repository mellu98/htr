'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import type { Lesson } from '@/lib/types';

/**
 * Wave Up Coach — free-form chat panel.
 *
 * Layout (xl+):
 *   ┌──────────────┬───────────────────────────────────────┐
 *   │ Chip rail    │ Chat thread (scrollable)              │
 *   │ + presets    │                                       │
 *   │ + lesson sel │  ─────────────────────────             │
 *   │ + cronologia │  [textarea] [Invia]                   │
 *   └──────────────┴───────────────────────────────────────┘
 *
 * Below xl: chip rail collapses into a horizontal chip strip above
 * the chat thread.
 *
 * The panel posts to /api/coach/chat (multi-turn M3 with the full
 * 28-lesson corpus in the system prompt). The 13 legacy promptId
 * presets still call /api/coach/ask so the deterministic CoachResponse
 * path keeps working — they're available as chips in a "Preset rapidi"
 * collapsible section under the chip rail.
 */

interface ActiveArtist {
  id: string;
  artistName: string;
  musicGenre: string | null;
  mainGoal: string | null;
  biggestBlock: string | null;
  nextCallAt: string | null;
}

interface CoachContextPayload {
  artist: ActiveArtist | null;
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
    expectedOutput: string | null;
  }[];
  activeTaskCount: number;
  blockedTaskCount: number;
  nextCallAt: string | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: string[];
  createdAt: string;
  pending?: boolean;
  failed?: boolean;
  fallback?: boolean;
}

interface HistoryTurn {
  id: string;
  promptLabel: string;
  coachResponse: string;
  sources: string[];
  createdAt: string;
}

interface CoachPanelProps {
  activeArtist: ActiveArtist | null;
  lessons: Lesson[];
  initialSessionId: string | null;
  initialMessages: ChatMessage[];
  initialHistory: HistoryTurn[];
  initialContext: CoachContextPayload;
}

// Six quick-action chips. Each pre-fills the textarea AND auto-submits.
const QUICK_CHIPS: { id: string; label: string; prefill: string }[] = [
  {
    id: 'release-plan',
    label: 'Pianifica release',
    prefill:
      'Aiutami a pianificare il lancio della mia prossima release. Dove sono bloccato?',
  },
  {
    id: 'today',
    label: 'Cosa faccio oggi',
    prefill:
      "Cosa dovrei fare oggi per far avanzare il progetto, in base ai miei task aperti?",
  },
  {
    id: 'metrics',
    label: 'Analisi numeri',
    prefill:
      'Analizza i miei ultimi snapshot metriche. Cosa sta crescendo, cosa è fermo, cosa devo testare?',
  },
  {
    id: 'outreach',
    label: 'Outreach',
    prefill:
      'Chi devo contattare questa settimana? Categorie, messaggio base, follow-up.',
  },
  {
    id: 'goals',
    label: 'Obiettivi',
    prefill:
      'Sto andando verso il mio obiettivo principale? Dove sono a rischio?',
  },
  {
    id: 'positioning',
    label: 'Posizionamento',
    prefill:
      'Fammi 5 domande per estrarre la mia frase di posizionamento.',
  },
];

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function CoachPanel({
  activeArtist,
  lessons,
  initialSessionId,
  initialMessages,
  initialHistory,
  initialContext,
}: CoachPanelProps) {
  const [sessionId, setSessionId] = useState<string>(
    initialSessionId ?? newSessionId(),
  );
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Persist sessionId in sessionStorage so reload keeps the thread.
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('coach-session-id');
      if (stored) setSessionId(stored);
      else sessionStorage.setItem('coach-session-id', sessionId);
    } catch {
      /* sessionStorage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending]);

  const lessonLabel = useMemo(() => {
    const map = new Map(lessons.map((l) => [l.slug, l.title] as const));
    return (slug: string) => map.get(slug) ?? slug;
  }, [lessons]);

  function pushUserMessage(text: string): ChatMessage {
    return {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: text,
      sources: [],
      createdAt: new Date().toISOString(),
      pending: true,
    };
  }

  function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || pending) return;

    setError(null);
    setInput('');
    const userMsg = pushUserMessage(text);
    setMessages((prev) => [...prev, userMsg]);

    startTransition(async () => {
      try {
        const res = await fetch('/api/coach/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ message: text, sessionId }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }

        // Mark user bubble as no longer pending; append assistant bubble.
        const assistantMsg: ChatMessage = {
          id: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: 'assistant',
          content: json.reply ?? '',
          sources: Array.isArray(json.sources) ? json.sources : [],
          createdAt: new Date().toISOString(),
          fallback: json.fallback === true,
        };

        setMessages((prev) =>
          prev.map((m) => (m.id === userMsg.id ? { ...m, pending: false } : m)).concat(assistantMsg),
        );

        // Update sessionId if the server minted a new one.
        if (json.sessionId && json.sessionId !== sessionId) {
          setSessionId(json.sessionId);
          try {
            sessionStorage.setItem('coach-session-id', json.sessionId);
          } catch {
            /* ignore */
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Errore di rete';
        setError(message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMsg.id ? { ...m, pending: false, failed: true } : m,
          ),
        );
      }
    });
  }

  function handleChip(chip: { prefill: string }) {
    setInput(chip.prefill);
    handleSend(chip.prefill);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function retry(messageId: string) {
    const m = messages.find((x) => x.id === messageId);
    if (!m) return;
    setMessages((prev) => prev.filter((x) => x.id !== messageId));
    handleSend(m.content);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
      {/* ── Chip rail ──────────────────────────────────────────────── */}
      <aside className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-violet-400" />
              Prompt rapidi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleChip(chip)}
                disabled={pending}
                className={cn(
                  'w-full rounded-md border border-border/60 bg-background/40 px-3 py-2 text-left text-xs transition-colors',
                  'hover:border-violet-400/40 hover:bg-violet-500/10 disabled:opacity-50',
                )}
              >
                <div className="font-medium">{chip.label}</div>
                <div className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                  {chip.prefill}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {initialHistory.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Cronologia preset
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {initialHistory.slice(0, 5).map((h) => (
                <details
                  key={h.id}
                  className="rounded-md border border-border/40 bg-background/30 px-2 py-1.5"
                >
                  <summary className="cursor-pointer truncate text-muted-foreground">
                    {h.promptLabel}
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-foreground/80">
                    {h.coachResponse}
                  </p>
                </details>
              ))}
            </CardContent>
          </Card>
        )}
      </aside>

      {/* ── Chat thread + composer ─────────────────────────────────── */}
      <section className="flex min-h-[60vh] flex-col">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MessageCircle className="h-5 w-5 text-violet-400" />
            Chat con il coach
          </h2>
          {activeArtist && (
            <p className="text-xs text-muted-foreground">
              artista attivo: <span className="text-foreground">{activeArtist.artistName}</span>
            </p>
          )}
        </div>

        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-border/60 bg-background/30 p-4"
        >
          {messages.length === 0 && !pending && (
            <EmptyState activeArtist={activeArtist} onChip={handleChip} />
          )}

          {messages.map((m) => (
            <Bubble
              key={m.id}
              msg={m}
              lessonLabel={lessonLabel}
              onRetry={retry}
            />
          ))}

          {pending && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Loader2 className="mt-0.5 h-3.5 w-3.5 animate-spin" />
              Sto leggendo il corso…
            </div>
          )}
        </div>

        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="mt-3 flex items-end gap-2"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            maxLength={2000}
            placeholder={
              activeArtist
                ? `Scrivi al coach… (Enter per inviare, Shift+Enter per andare a capo)`
                : `Scrivi al coach…`
            }
            disabled={pending}
            className={cn(
              'flex-1 resize-none rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm',
              'placeholder:text-muted-foreground/70 focus:border-violet-400/60 focus:outline-none focus:ring-1 focus:ring-violet-400/30',
              'disabled:opacity-60',
            )}
          />
          <Button
            type="submit"
            size="lg"
            disabled={pending || !input.trim()}
            className="shrink-0"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Invia</span>
          </Button>
        </form>
      </section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function EmptyState({
  activeArtist,
  onChip,
}: {
  activeArtist: ActiveArtist | null;
  onChip: (chip: { prefill: string }) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-12 text-center">
      <Bot className="h-10 w-10 text-violet-400/60" />
      <div>
        <h3 className="text-base font-semibold">
          {activeArtist
            ? `Ciao ${activeArtist.artistName}, di cosa parliamo?`
            : 'Ciao! Sono il coach di Wave Up.'}
        </h3>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          Ho letto tutte le 28 lezioni del corso HTR Training. Chiedimi
          qualsiasi cosa: posizionamento, pitch playlist, strategia contenuti,
          monetizzazione, mindset… cita pure un modulo o una parola chiave.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {QUICK_CHIPS.slice(0, 3).map((c) => (
          <Button
            key={c.id}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChip(c)}
          >
            {c.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function Bubble({
  msg,
  lessonLabel,
  onRetry,
}: {
  msg: ChatMessage;
  lessonLabel: (slug: string) => string;
  onRetry: (id: string) => void;
}) {
  const isUser = msg.role === 'user';
  return (
    <div
      className={cn(
        'flex items-start gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-violet-500/20 text-violet-300'
            : 'bg-cyan-500/15 text-cyan-300',
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      <div
        className={cn(
          'max-w-[85%] rounded-xl border px-3 py-2 text-sm shadow-sm',
          isUser
            ? 'border-violet-400/30 bg-violet-500/10 text-foreground'
            : 'border-border/60 bg-background/60 text-foreground',
          msg.failed && 'border-red-400/40 bg-red-500/10',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <>
            {msg.fallback && (
              <Badge variant="warning" className="mb-2">
                Modalità offline
              </Badge>
            )}
            <Markdown content={msg.content} />
            {msg.sources.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  fonti:
                </span>
                {msg.sources.map((s) => (
                  <Badge key={s} variant="secondary" className="text-[10px]">
                    {lessonLabel(s)}
                  </Badge>
                ))}
              </div>
            )}
          </>
        )}

        {msg.pending && (
          <p className="mt-1 text-[10px] text-muted-foreground">invio…</p>
        )}
        {msg.failed && (
          <button
            type="button"
            onClick={() => onRetry(msg.id)}
            className="mt-1 text-[10px] text-red-300 underline"
          >
            riprova
          </button>
        )}
        {!isUser && !msg.pending && !msg.failed && msg.content && (
          <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" />
            {new Date(msg.createdAt).toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  );
}
