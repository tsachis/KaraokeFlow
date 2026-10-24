import { parseLrc, type LyricLine } from './lrc';
import { cleanTitle, primaryArtist, splitArtistFromTitle, type TrackQuery } from './trackQuery';

const BASE_URL = 'https://lrclib.net/api';
// LRCLIB asks clients to identify themselves.
const USER_AGENT = 'KaraokeFlow/1.0.0 (https://github.com/tsachis/KaraokeFlow)';
const DURATION_TOLERANCE_SEC = 5;

export interface LrclibRecord {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string | null;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

export type LyricsResult =
  | { kind: 'synced'; lines: LyricLine[] }
  | { kind: 'plain'; text: string }
  | { kind: 'instrumental' }
  | { kind: 'notFound' };

type Fetch = typeof fetch;

async function getJson<T>(path: string, params: Record<string, string>, fetchFn: Fetch, signal?: AbortSignal): Promise<T | null> {
  const query = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  const response = await fetchFn(`${BASE_URL}${path}?${query}`, {
    headers: { 'User-Agent': USER_AGENT, 'Lrclib-Client': USER_AGENT },
    signal,
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`LRCLIB ${path} failed with ${response.status}`);
  return (await response.json()) as T;
}

/** Synced beats plain; within that, the closest duration wins. Records too far off in length are dropped. */
export function pickBestRecord(records: readonly LrclibRecord[], durationSec?: number): LrclibRecord | null {
  const scored = records
    .filter((record) => record.instrumental || record.syncedLyrics || record.plainLyrics)
    .map((record) => ({
      record,
      diff: durationSec ? Math.abs(record.duration - durationSec) : 0,
    }))
    .filter(({ diff }) => diff <= DURATION_TOLERANCE_SEC)
    .sort((a, b) => Number(Boolean(b.record.syncedLyrics)) - Number(Boolean(a.record.syncedLyrics)) || a.diff - b.diff);
  return scored[0]?.record ?? null;
}

export function toResult(record: LrclibRecord | null): LyricsResult {
  if (!record) return { kind: 'notFound' };
  if (record.syncedLyrics) {
    const lines = parseLrc(record.syncedLyrics);
    if (lines.length > 0) return { kind: 'synced', lines };
  }
  if (record.instrumental) return { kind: 'instrumental' };
  if (record.plainLyrics) return { kind: 'plain', text: record.plainLyrics };
  return { kind: 'notFound' };
}

/**
 * Looks a track up in several passes, from most to least exact:
 * exact /get (needs duration) → search by cleaned title + first artist →
 * "Artist - Song" split from the title (YouTube) → free-text search.
 */
export async function fetchLyrics(track: TrackQuery, fetchFn: Fetch = fetch, signal?: AbortSignal): Promise<LyricsResult> {
  const title = cleanTitle(track.title);
  const artist = primaryArtist(track.artist);
  const { durationSec } = track;

  if (durationSec && artist) {
    const exact = await getJson<LrclibRecord>(
      '/get',
      { track_name: title, artist_name: artist, album_name: track.album ?? '', duration: String(Math.round(durationSec)) },
      fetchFn,
      signal,
    );
    if (exact?.syncedLyrics || exact?.instrumental) return toResult(exact);
  }

  const searches: Record<string, string>[] = [];
  if (artist) searches.push({ track_name: title, artist_name: artist });
  const split = splitArtistFromTitle(title);
  if (split) searches.push({ track_name: cleanTitle(split.title), artist_name: primaryArtist(split.artist) });
  searches.push({ q: artist ? `${title} ${artist}` : title });

  let fallback: LrclibRecord | null = null;
  for (const params of searches) {
    const records = (await getJson<LrclibRecord[]>('/search', params, fetchFn, signal)) ?? [];
    const best = pickBestRecord(records, durationSec);
    if (best?.syncedLyrics) return toResult(best);
    fallback ??= best;
  }
  return toResult(fallback);
}
