'use client';

import { useState } from 'react';
import { Check, RefreshCw, Sparkles, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { QuizQuestion } from '@/lib/types';

interface QuizTabProps {
  slug: string;
  questions: QuizQuestion[] | null;
}

export function QuizTab({ slug, questions }: QuizTabProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    correct: number;
    total: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!questions || questions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center">
          <p className="font-medium">Quiz non ancora generato</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Apri la pagina AI Processing e lancia l'analisi per questa lezione.
          </p>
        </CardContent>
      </Card>
    );
  }
  const list = questions;

  function pick(qid: string, value: string) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  async function handleSubmit() {
    if (Object.keys(answers).length < list.length) {
      if (!confirm('Non hai risposto a tutte le domande. Inviare comunque?')) return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quiz/${slug}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setResult({
        score: json.score,
        correct: json.correctAnswers,
        total: json.totalQuestions,
      });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setAnswers({});
    setSubmitted(false);
    setResult(null);
  }

  return (
    <div className="space-y-4">
      {submitted && result && (
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-brand" />
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="text-5xl font-bold gradient-text">{result.score}%</div>
            <p className="text-sm text-muted-foreground">
              Hai risposto correttamente a <span className="font-semibold text-foreground">{result.correct}</span> domande su {result.total}.
            </p>
            <Progress
              value={result.score}
              className="h-1.5 w-48"
              indicatorClassName="bg-gradient-brand"
            />
            <Button size="sm" variant="outline" onClick={reset} className="mt-2">
              <RefreshCw className="h-4 w-4" />
              Riprova
            </Button>
          </CardContent>
        </Card>
      )}

      <ol className="space-y-4">
        {list.map((q, idx) => {
          const userAnswer = answers[q.id];
          const correct = submitted && userAnswer === q.correctAnswer;
          const wrong = submitted && userAnswer !== q.correctAnswer;
          return (
            <li key={q.id}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">#{idx + 1}</span>
                      {q.question}
                    </CardTitle>
                    {submitted && correct && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                        <Check className="h-3 w-3" /> corretta
                      </span>
                    )}
                    {submitted && wrong && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-xs text-rose-300">
                        <X className="h-3 w-3" /> errata
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid gap-2">
                    {q.options.map((opt) => {
                      const isUser = userAnswer === opt;
                      const isCorrect = submitted && opt === q.correctAnswer;
                      const isWrongPick = submitted && isUser && opt !== q.correctAnswer;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => pick(q.id, opt)}
                          disabled={submitted}
                          className={
                            'flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-all ' +
                            (isCorrect
                              ? 'border-emerald-400/50 bg-emerald-500/10'
                              : isWrongPick
                                ? 'border-rose-400/50 bg-rose-500/10'
                                : isUser
                                  ? 'border-accent/50 bg-accent/10'
                                  : 'border-border/60 bg-background/40 hover:bg-muted/60')
                          }
                        >
                          <span
                            className={
                              'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ' +
                              (isCorrect
                                ? 'border-emerald-400 bg-emerald-500/30'
                                : isWrongPick
                                  ? 'border-rose-400 bg-rose-500/30'
                                  : isUser
                                    ? 'border-accent bg-accent/30'
                                    : 'border-border')
                            }
                          >
                            {isCorrect ? (
                              <Check className="h-3 w-3 text-emerald-200" />
                            ) : isWrongPick ? (
                              <X className="h-3 w-3 text-rose-200" />
                            ) : isUser ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                            ) : null}
                          </span>
                          <span className="flex-1">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                  {submitted && q.explanation && (
                    <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                      <span className="inline-flex items-center gap-1 text-accent">
                        <Sparkles className="h-3 w-3" /> Spiegazione
                      </span>
                      <p className="mt-1 text-foreground/90">{q.explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>

      {!submitted && (
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Invio…' : 'Invia risposte'}
          </Button>
        </div>
      )}
    </div>
  );
}
