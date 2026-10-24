import { useEffect, useState } from 'react';

import { fetchLyrics, type LyricsResult } from '../lib/lrclib';
import { readCachedLyrics, writeCachedLyrics } from '../lib/lyricsCache';
import type { TrackQuery } from '../lib/trackQuery';

export type LyricsStatus =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; result: LyricsResult }
  | { status: 'error'; message: string };

export function useLyrics(track: TrackQuery | null): LyricsStatus {
  const [lyrics, setLyrics] = useState<LyricsStatus>({ status: 'idle' });
  const key = track ? `${track.artist}|${track.title}|${Math.round(track.durationSec ?? 0)}` : null;

  useEffect(() => {
    if (!track) {
      setLyrics({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
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
        setLyrics({ status: 'error', message: error instanceof Error ? error.message : String(error) });
      }
    };
    void load();

    return () => controller.abort();
    // `key` captures everything about the track that changes the lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return lyrics;
}
