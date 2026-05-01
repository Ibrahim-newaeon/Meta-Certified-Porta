'use client';
import { memo, useRef, useState } from 'react';
import { Button } from '@/components/shared/button';
import { Textarea } from '@/components/shared/input';
import { readSseStream } from '@/lib/sse';

type Msg = { role: 'user' | 'assistant'; content: string };

const Message = memo(function Message({
  role,
  content,
  placeholder,
}: {
  role: Msg['role'];
  content: string;
  placeholder: boolean;
}) {
  return (
    <div className={role === 'user' ? 'text-right' : ''}>
      <span
        className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 ${
          role === 'user'
            ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
            : 'bg-[var(--surface-muted)] text-[var(--color-text)]'
        }`}
      >
        {content || (placeholder ? '…' : '')}
      </span>
    </div>
  );
});

export function ChatPanel({ lessonId }: { lessonId?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | undefined>(undefined);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setError(null);

    const userMsg: Msg = { role: 'user', content: text };
    setMessages((m) => [...m, userMsg, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        lessonId,
        message: text,
        history: messages.slice(-10),
      }),
    });

    if (!res.ok || !res.body) {
      const code = res.status === 429 ? 'You hit the daily AI tutor limit.' : `Error ${res.status}.`;
      setMessages((m) => [...m.slice(0, -1), { role: 'assistant', content: code }]);
      setError(code);
      setStreaming(false);
      return;
    }

    try {
      for await (const { event, data } of readSseStream(res.body)) {
        let parsed: { sessionId?: string; text?: string; message?: string };
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }

        if (event === 'session' && parsed.sessionId) {
          sessionIdRef.current = parsed.sessionId;
        } else if (event === 'delta' && parsed.text) {
          const chunk = parsed.text;
          setMessages((m) => {
            const copy = m.slice();
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = {
              role: 'assistant',
              content: last.content + chunk,
            };
            return copy;
          });
        } else if (event === 'error') {
          setError(parsed.message ?? 'Stream error');
        } else if (event === 'done') {
          break;
        }
      }
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-full min-h-[400px] flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-2 text-sm">
        <span className="font-medium">AI Tutor</span>
        <span className="ml-2 text-xs text-[var(--color-text-subtle)]">
          Meta Blueprint coach · {lessonId ? 'lesson context loaded' : 'general'}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm" aria-live="polite">
        {messages.length === 0 && (
          <p className="text-center text-[var(--color-text-muted)]">
            Ask about Advantage+, CAPI, attribution windows, auction dynamics…
          </p>
        )}
        {messages.map((m, i) => (
          <Message
            key={i}
            role={m.role}
            content={m.content}
            placeholder={streaming && i === messages.length - 1}
          />
        ))}
        {error && (
          <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}
      </div>

      <div className="flex gap-2 border-t border-[var(--border)] p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder="Ask the tutor…"
          aria-label="Message the AI tutor"
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button
          onClick={send}
          disabled={streaming || !input.trim()}
          className="self-end"
        >
          {streaming ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
