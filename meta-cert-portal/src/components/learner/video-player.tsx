'use client';
import MuxPlayer from '@mux/mux-player-react';
import { useEffect, useRef } from 'react';

type Tokens = { playback: string; thumbnail: string; storyboard: string };

export function VideoPlayer({
  playbackId,
  tokens,
  startSeconds,
  onTime,
  onEnd,
}: {
  playbackId: string;
  tokens: Tokens;
  startSeconds: number;
  onTime?: (seconds: number) => void;
  onEnd?: () => void;
}) {
  const ref = useRef<unknown>(null);
  const lastReportedAt = useRef(0);

  useEffect(() => {
    const el = ref.current as { currentTime: number } | null;
    if (el && startSeconds > 0) el.currentTime = startSeconds;
  }, [startSeconds]);

  return (
    <div className="overflow-hidden rounded-lg border bg-black">
      <MuxPlayer
        ref={(r) => {
          ref.current = r;
        }}
        streamType="on-demand"
        playbackId={playbackId}
        tokens={tokens}
        onTimeUpdate={(e: Event) => {
          const t = (e.target as { currentTime?: number }).currentTime ?? 0;
          // SECURITY/perf: debounce DB writes — only report every 10 seconds.
          if (Math.abs(t - lastReportedAt.current) >= 10) {
            lastReportedAt.current = t;
            onTime?.(t);
          }
        }}
        onEnded={() => onEnd?.()}
      />
    </div>
  );
}
