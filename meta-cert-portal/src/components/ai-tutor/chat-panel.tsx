'use client';
import { useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

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

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Split on the SSE event delimiter; keep any trailing partial event.
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';

      for (const block of blocks) {
        if (!block.trim()) continue;
        const lines = block.split('\n');
        const evtLine = lines.find((l) => l.startsWith('event: '));
        const dataLine = lines.find((l) => l.startsWith('data: '));
        if (!evtLine || !dataLine) continue;

        const evt = evtLine.slice('event: '.length);
        let data: { sessionId?: string; text?: string; message?: string };
        try {
          data = JSON.parse(dataLine.slice('data: '.length));
        } catch {
          continue;
        }

        if (evt === 'session' && data.sessionId) {
          sessionIdRef.current = data.sessionId;
        } else if (evt === 'delta' && data.text) {
          setMessages((m) => {
            const copy = [...m];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = {
              role: 'assistant',
              content: last.content + data.text,
            };
            return copy;
          });
        } else if (evt === 'error') {
          setError(data.message ?? 'Stream error');
          setStreaming(false);
        } else if (evt === 'done') {
          setStreaming(false);
        }
      }
    }
    setStreaming(false);
  }

  return (
    <div className="flex h-[600px] flex-col rounded-lg border bg-white">
      <div className="border-b px-4 py-2 text-sm">
        <span className="font-medium">AI Tutor</span>
        <span className="ml-2 text-xs text-slate-500">
          Meta Blueprint coach · {lessonId ? 'lesson context loaded' : 'general'}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {messages.length === 0 && (
          <p className="text-center text-slate-500">
            Ask about Advantage+, CAPI, attribution windows, auction dynamics…
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <span
              className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 ${
                m.role === 'user'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-900'
              }`}
            >
              {m.content || (streaming && i === messages.length - 1 ? '…' : '')}
            </span>
          </div>
        ))}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <div className="flex gap-2 border-t p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder="Ask the tutor…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          onClick={send}
          disabled={streaming || !input.trim()}
          className="inline-flex h-9 items-center self-end rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
