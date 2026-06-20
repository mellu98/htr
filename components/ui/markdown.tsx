import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Minimal, safe markdown renderer for our generated files.
 *
 * Generated content is *trusted* (we wrote it locally) — we still apply
 * a tiny set of rules to keep the rendering predictable:
 *   - headings (#, ##, ###)
 *   - paragraphs
 *   - unordered lists (- foo)
 *   - ordered lists (1. foo)
 *   - blockquotes (> ...)
 *   - inline **bold** and `code`
 *   - horizontal rule (---)
 *
 * Anything else (tables, links) is rendered as plain text. This keeps the
 * dependency surface zero — no `marked`, no `remark`, no `rehype`.
 */

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  const blocks = splitBlocks(content);
  return (
    <div className={cn('prose-container space-y-4', className)}>
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

interface Block {
  kind:
    | 'h1'
    | 'h2'
    | 'h3'
    | 'p'
    | 'ul'
    | 'ol'
    | 'quote'
    | 'hr'
    | 'code';
  text?: string;
  items?: string[];
}

function splitBlocks(input: string): Block[] {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }
    if (/^---\s*$/.test(line)) {
      blocks.push({ kind: 'hr' });
      i++;
      continue;
    }
    if (/^#\s+/.test(line)) {
      blocks.push({ kind: 'h1', text: line.replace(/^#\s+/, '') });
      i++;
      continue;
    }
    if (/^##\s+/.test(line)) {
      blocks.push({ kind: 'h2', text: line.replace(/^##\s+/, '') });
      i++;
      continue;
    }
    if (/^###\s+/.test(line)) {
      blocks.push({ kind: 'h3', text: line.replace(/^###\s+/, '') });
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ kind: 'quote', text: buf.join(' ') });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ul', items: buf });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ol', items: buf });
      continue;
    }
    // default: paragraph (collect contiguous non-blank lines)
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#|---|>|-|\*|\d+\.)/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    if (buf.length === 0) {
      // Defensive: lone line that matches an exclusion regex but wasn't handled
      // above (e.g. **bold** inline). Render as a paragraph and advance.
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ kind: 'p', text: buf.join(' ') });
  }
  return blocks;
}

function Block({ block }: { block: Block }) {
  const inline = (text: string) => {
    // Bold then code (greedy enough for our content).
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;
    const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(remaining)) !== null) {
      if (match.index > last) parts.push(remaining.slice(last, match.index));
      const token = match[0];
      if (token.startsWith('**')) {
        parts.push(
          <strong key={key++} className="font-semibold text-foreground">
            {token.slice(2, -2)}
          </strong>,
        );
      } else {
        parts.push(
          <code
            key={key++}
            className="rounded bg-muted px-1.5 py-0.5 text-[0.9em] text-accent"
          >
            {token.slice(1, -1)}
          </code>,
        );
      }
      last = match.index + token.length;
    }
    if (last < remaining.length) parts.push(remaining.slice(last));
    return parts;
  };

  switch (block.kind) {
    case 'h1':
      return (
        <h1 className="text-3xl font-bold tracking-tight gradient-text">
          {inline(block.text ?? '')}
        </h1>
      );
    case 'h2':
      return (
        <h2 className="text-2xl font-semibold tracking-tight">{inline(block.text ?? '')}</h2>
      );
    case 'h3':
      return (
        <h3 className="text-lg font-semibold tracking-tight">{inline(block.text ?? '')}</h3>
      );
    case 'p':
      return (
        <p className="leading-relaxed text-foreground/90">{inline(block.text ?? '')}</p>
      );
    case 'ul':
      return (
        <ul className="list-disc space-y-1.5 pl-6 marker:text-accent">
          {block.items?.map((it, idx) => (
            <li key={idx}>{inline(it)}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="list-decimal space-y-1.5 pl-6 marker:text-accent">
          {block.items?.map((it, idx) => (
            <li key={idx}>{inline(it)}</li>
          ))}
        </ol>
      );
    case 'quote':
      return (
        <blockquote className="rounded-md border-l-4 border-accent bg-muted/40 px-4 py-2 italic text-muted-foreground">
          {inline(block.text ?? '')}
        </blockquote>
      );
    case 'hr':
      return <hr className="border-border/60" />;
    default:
      return null;
  }
}
