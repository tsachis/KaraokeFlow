import type { CarLyrics } from '../../modules/media-session';
import type { LyricsStatus } from '../hooks/useLyrics';
import { messageFor } from './lyricsMessage';
import { withDirectionMark } from './textDirection';

/**
 * Lyrics for the Android Auto screen. `title` must be the player's raw title:
 * the native side uses it to tell whether these lyrics belong to the song playing now.
 */
export function toCarLyrics(title: string | null | undefined, lyrics: LyricsStatus): CarLyrics | null {
  if (!title) return null;
  if (lyrics.status === 'ready' && lyrics.result.kind === 'synced') {
    const lines = lyrics.result.lines.map((line) => ({
      timeMs: Math.round(line.time * 1000),
      text: withDirectionMark(line.text),
    }));
    return { title, lines, message: null };
  }
  return { title, lines: [], message: messageFor(lyrics) };
}
