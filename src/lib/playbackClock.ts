export interface PlaybackSnapshot {
  positionMs: number;
  /** Wall-clock ms when positionMs was measured. */
  positionUpdatedAt: number;
  playbackSpeed: number;
  isPlaying: boolean;
  durationMs: number;
}

/**
 * Android only reports position on play, pause and seek, so we extrapolate
 * from the last report. `offsetMs` is the user's sync correction (positive = lyrics earlier).
 */
export function estimatePositionSec(snapshot: PlaybackSnapshot, nowMs: number, offsetMs = 0): number {
  const elapsed = snapshot.isPlaying ? (nowMs - snapshot.positionUpdatedAt) * (snapshot.playbackSpeed || 1) : 0;
  let positionMs = snapshot.positionMs + Math.max(0, elapsed) + offsetMs;
  if (snapshot.durationMs > 0) positionMs = Math.min(positionMs, snapshot.durationMs);
  return Math.max(0, positionMs) / 1000;
}
