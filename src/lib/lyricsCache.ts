import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LyricsResult } from './lrclib';
import type { TrackQuery } from './trackQuery';

const PREFIX = 'lyrics:v1:';
// A miss is retried after a day; the crowd-sourced database grows.
const NOT_FOUND_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  savedAt: number;
  result: LyricsResult;
}

export function cacheKey(track: TrackQuery): string {
  const duration = track.durationSec ? Math.round(track.durationSec) : 0;
  return `${PREFIX}${track.artist.toLowerCase()}|${track.title.toLowerCase()}|${duration}`;
}

export async function readCachedLyrics(track: TrackQuery, now = Date.now()): Promise<LyricsResult | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(track));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (entry.result.kind === 'notFound' && now - entry.savedAt > NOT_FOUND_TTL_MS) return null;
    return entry.result;
  } catch {
    return null;
  }
}

export async function writeCachedLyrics(track: TrackQuery, result: LyricsResult, now = Date.now()): Promise<void> {
  try {
    const entry: CacheEntry = { savedAt: now, result };
    await AsyncStorage.setItem(cacheKey(track), JSON.stringify(entry));
  } catch {
    // The cache is only a speed-up; a failed write is not worth surfacing.
  }
}
