import { StyleSheet, Text, View } from 'react-native';

import type { LyricsStatus } from '../hooks/useLyrics';
import type { DisplayMode, FlipAxis } from '../hooks/useSettings';
import { findActiveIndex } from '../lib/lrc';
import { withDirectionMark } from '../lib/textDirection';
import { LyricLineText } from './LyricLineText';

const MUSIC_NOTE = '♪';

interface LyricsDisplayProps {
  title: string;
  artist: string;
  lyrics: LyricsStatus;
  positionSec: number;
  mode: DisplayMode;
  flipAxis: FlipAxis;
  textScale: number;
}

const MIRROR_TRANSFORMS = {
  vertical: [{ scaleY: -1 }],
  horizontal: [{ scaleX: -1 }],
  both: [{ scaleX: -1 }, { scaleY: -1 }],
} as const;

function messageFor(lyrics: LyricsStatus): string {
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

const FONT_SIZE = { trackInfo: 16, side: 24, active: 44 } as const;

export function LyricsDisplay({ title, artist, lyrics, positionSec, mode, flipAxis, textScale }: LyricsDisplayProps) {
  const lines = lyrics.status === 'ready' && lyrics.result.kind === 'synced' ? lyrics.result.lines : null;
  const activeIndex = lines ? findActiveIndex(lines, positionSec) : -1;

  // Blank LRC lines mark instrumental gaps; show a note instead of an empty row.
  const lineAt = (index: number): string => {
    if (!lines || index < 0 || index >= lines.length) return '';
    return lines[index].text || MUSIC_NOTE;
  };

  const active = lines ? (activeIndex < 0 ? MUSIC_NOTE : lineAt(activeIndex)) : messageFor(lyrics);
  const trackInfo = artist ? `${title} — ${artist}` : title;
  const sideSize = { fontSize: FONT_SIZE.side * textScale, minHeight: 30 * textScale };

  return (
    <View style={[styles.container, mode === 'hud' && { transform: [...MIRROR_TRANSFORMS[flipAxis]] }]}>
      {trackInfo ? (
        <Text style={[styles.trackInfo, { fontSize: FONT_SIZE.trackInfo * textScale }]} numberOfLines={1}>
          {withDirectionMark(trackInfo)}
        </Text>
      ) : null}
      <LyricLineText text={lineAt(activeIndex - 1)} style={[styles.sideLine, sideSize]} numberOfLines={1} />
      <LyricLineText text={active} style={[styles.activeLine, { fontSize: FONT_SIZE.active * textScale }]} />
      <LyricLineText text={lineAt(activeIndex + 1)} style={[styles.sideLine, sideSize]} numberOfLines={1} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  trackInfo: {
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
  },
  sideLine: {
    color: '#555555',
    marginVertical: 12,
  },
  activeLine: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginVertical: 8,
  },
});
