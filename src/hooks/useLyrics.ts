import { useCallback, useEffect, useState } from 'react';

import { fetchLyrics, type LyricsResult } from '../lib/lrclib';
import { readCachedLyrics, writeCachedLyrics } from '../lib/lyricsCache';
import type { TrackQuery } from '../lib/trackQuery';

// After a failed lookup, try the whole lookup again on its own after these waits.
const AUTO_RETRY_DELAYS_MS = [5000, 15000];

export type LyricsStatus =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; result: LyricsResult }
  | { status: 'error'; message: string; willRetry: boolean };

export interface LyricsState {
  lyrics: LyricsStatus;
  retry: () => void;
}

export function useLyrics(track: TrackQuery | null): LyricsState {
  const [lyrics, setLyrics] = useState<LyricsStatus>({ status: 'idle' });
  const key = track ? `${track.artist}|${track.title}|${Math.round(track.durationSec ?? 0)}` : null;

  // Attempts are counted per track, so a new song starts again from zero.
  const [attempts, setAttempts] = useState({ key, count: 0 });
  const attempt = attempts.key === key ? attempts.count : 0;
  const retry = useCallback(() => setAttempts({ key, count: attempt + 1 }), [key, attempt]);

  useEffect(() => {
    if (!track) {
      setLyrics({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    setLyrics({ status: 'loading' });

    const load = async (): Promise<void> => {
      try {
        const cached = await readCachedLyrics(track);
        const result = cached ?? (await fetchLyrics(track, fetch, controller.signal));
        if (controller.signal.aborted) return;
        if (!cached) await writeCachedLyrics(track, result);
        setLyrics({ status: 'ready', result });
      } catch (error) {
        if (controller.signal.aborted) return;
        const delay = AUTO_RETRY_DELAYS_MS[attempt];
        if (delay !== undefined) retryTimer = setTimeout(retry, delay);
        setLyrics({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
          willRetry: delay !== undefined,
        });
      }
    };
    void load();

    return () => {
      controller.abort();
      clearTimeout(retryTimer);
    };
    // `key` captures everything about the track that changes the lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  return { lyrics, retry };
}
