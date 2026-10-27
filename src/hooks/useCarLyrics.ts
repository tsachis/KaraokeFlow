import { useEffect, useMemo } from 'react';

import { MediaSession } from '../../modules/media-session';
import { toCarLyrics } from '../lib/carLyrics';
import type { LyricsStatus } from './useLyrics';

/** Hands the current lyrics to the Android Auto service, which keeps the car screen in time. */
export function useCarLyrics(title: string | null | undefined, lyrics: LyricsStatus): void {
  const carLyrics = useMemo(() => toCarLyrics(title, lyrics), [title, lyrics]);

  useEffect(() => {
    MediaSession?.setCarLyrics(carLyrics);
  }, [carLyrics]);
}
