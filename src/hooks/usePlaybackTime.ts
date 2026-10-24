import { useEffect, useState } from 'react';

import { estimatePositionSec, type PlaybackSnapshot } from '../lib/playbackClock';

const TICK_MS = 100;

/** Current track position in seconds, ticking while the player is playing. */
export function usePlaybackTime(snapshot: PlaybackSnapshot | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!snapshot?.isPlaying) {
      setNow(Date.now());
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [snapshot]);

  return snapshot ? estimatePositionSec(snapshot, now) : 0;
}
