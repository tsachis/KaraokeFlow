export interface MediaState {
  packageName: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  durationMs: number;
  positionMs: number;
  /** Wall-clock time (ms since epoch) when positionMs was measured. */
  positionUpdatedAt: number;
  playbackSpeed: number;
  isPlaying: boolean;
}

/** Lyrics for the Android Auto screen; the native side does the timing. */
export interface CarLyrics {
  /** The player's title these lyrics were looked up for. */
  title: string;
  /** Synced lines; `timeMs` is from the start of the track, empty `text` is a gap. */
  lines: { timeMs: number; text: string }[];
  /** Shown when there are no synced lines. */
  message: string | null;
}

/** `empty: true` means no app is holding a media session. */
export type MediaStateEvent = MediaState | { empty: true };

// A type alias, not an interface: EventsMap needs an implicit index signature.
export type MediaSessionEvents = {
  onStateChange: (event: MediaStateEvent) => void;
};
