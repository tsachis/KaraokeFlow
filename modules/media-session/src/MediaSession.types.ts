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

/** `empty: true` means no app is holding a media session. */
export type MediaStateEvent = MediaState | { empty: true };

// A type alias, not an interface: EventsMap needs an implicit index signature.
export type MediaSessionEvents = {
  onStateChange: (event: MediaStateEvent) => void;
};
