import type { LyricsStatus } from '../hooks/useLyrics';

export const MUSIC_NOTE = '♪';

/** What to show instead of synced lines; empty when there are synced lines. */
export function messageFor(lyrics: LyricsStatus): string {
  switch (lyrics.status) {
    case 'idle':
      return 'Play music to sync lyrics...';
    case 'loading':
      return 'Finding lyrics...';
    case 'error':
      return lyrics.willRetry ? 'Could not load lyrics, trying again...' : 'Could not load lyrics';
    case 'ready':
      switch (lyrics.result.kind) {
        case 'instrumental':
          return `${MUSIC_NOTE} Instrumental ${MUSIC_NOTE}`;
        case 'plain':
          return 'No synced lyrics for this song';
        case 'notFound':
          return 'No lyrics found';
        case 'synced':
          return '';
      }
  }
}
