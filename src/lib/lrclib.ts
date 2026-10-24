import { parseLrc, type LyricLine } from './lrc';
import { cleanTitle, primaryArtist, splitArtistFromTitle, type TrackQuery } from './trackQuery';

const BASE_URL = 'https://lrclib.net/api';
// LRCLIB asks clients to identify themselves.
const USER_AGENT = 'KaraokeFlow/1.0.0 (https://github.com/tsachis/KaraokeFlow)';
const DURATION_TOLERANCE_SEC = 5;
// A title-only search has no artist to confirm the match, so the length must agree closely.
const TITLE_ONLY_TOLERANCE_SEC = 2;
// LRCLIB often answers 503 "server busy" for a moment; these are the waits between tries.
const RETRY_DELAYS_MS = [1000, 2500];

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
  for (let attempt = 0; ; attempt++) {
    const response = await fetchFn(`${BASE_URL}${path}?${query}`, {
      headers: { 'User-Agent': USER_AGENT, 'Lrclib-Client': USER_AGENT },
      signal,
    });
    if (response.status === 404) return null;
    if (response.ok) return (await response.json()) as T;
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt >= RETRY_DELAYS_MS.length) {
      throw new Error(`LRCLIB ${path} failed with ${response.status}`);
    }
    await sleep(RETRY_DELAYS_MS[attempt], signal);
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Aborted'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('Aborted'));
    });
  });
}

/** Synced beats plain; within that, the closest duration wins. Records too far off in length are dropped. */
export function pickBestRecord(
  records: readonly LrclibRecord[],
  durationSec?: number,
  toleranceSec = DURATION_TOLERANCE_SEC,
): LrclibRecord | null {
  const scored = records
    .filter((record) => record.instrumental || record.syncedLyrics || record.plainLyrics)
    .map((record) => ({
      record,
      diff: durationSec ? Math.abs(record.duration - durationSec) : 0,
    }))
    .filter(({ diff }) => diff <= toleranceSec)
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
 * "Artist - Song" split from the title (YouTube) → title only, matched by
 * duration → free-text search.
 *
 * The title-only pass is for Hebrew songs: LRCLIB often stores the artist in
 * one script ("ערן צור") while the player reports the other ("Eran Tzur").
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

  const searches: { params: Record<string, string>; toleranceSec?: number }[] = [];
  if (artist) searches.push({ params: { track_name: title, artist_name: artist } });
  const split = splitArtistFromTitle(title);
  if (split) searches.push({ params: { track_name: cleanTitle(split.title), artist_name: primaryArtist(split.artist) } });
  if (durationSec) searches.push({ params: { track_name: title }, toleranceSec: TITLE_ONLY_TOLERANCE_SEC });
  searches.push({ params: { q: artist ? `${title} ${artist}` : title } });

  let fallback: LrclibRecord | null = null;
  for (const { params, toleranceSec } of searches) {
    const records = (await getJson<LrclibRecord[]>('/search', params, fetchFn, signal)) ?? [];
    const best = pickBestRecord(records, durationSec, toleranceSec);
    if (best?.syncedLyrics) return toResult(best);
    fallback ??= best;
  }
  return toResult(fallback);
}
