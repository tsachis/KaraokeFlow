import { fetchLyrics, pickBestRecord, type LrclibRecord } from '../lrclib';

function record(overrides: Partial<LrclibRecord>): LrclibRecord {
  return {
    id: 1,
    trackName: 'Song',
    artistName: 'Artist',
    albumName: null,
    duration: 200,
    instrumental: false,
    plainLyrics: null,
    syncedLyrics: null,
    ...overrides,
  };
}

function mockFetch(routes: Record<string, unknown>) {
  const calls: string[] = [];
  const fn = jest.fn(async (url: string) => {
    calls.push(url);
    const path = new URL(url).pathname.replace('/api', '');
    const body = routes[path];
    return {
      ok: body !== undefined,
      status: body === undefined ? 404 : 200,
      json: async () => body,
    };
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

describe('pickBestRecord', () => {
  it('prefers synced lyrics, then closest duration', () => {
    const plainClose = record({ id: 1, duration: 200, plainLyrics: 'x' });
    const syncedFar = record({ id: 2, duration: 204, syncedLyrics: '[00:01.00]x' });
    const syncedClose = record({ id: 3, duration: 201, syncedLyrics: '[00:01.00]x' });
    expect(pickBestRecord([plainClose, syncedFar, syncedClose], 200)?.id).toBe(3);
  });

  it('drops records whose duration is too far off', () => {
    expect(pickBestRecord([record({ duration: 300, syncedLyrics: 'x' })], 200)).toBeNull();
  });
});

describe('fetchLyrics', () => {
  it('uses the exact /get match when it has synced lyrics', async () => {
    const { fn, calls } = mockFetch({ '/get': record({ syncedLyrics: '[00:01.00]Hello' }) });
    const result = await fetchLyrics({ title: 'Song - Remastered', artist: 'Artist & Friend', durationSec: 200 }, fn);
    expect(result).toEqual({ kind: 'synced', lines: [{ time: 1, text: 'Hello' }] });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('track_name=Song&artist_name=Artist&');
  });

  it('falls back to search and encodes Hebrew', async () => {
    const { fn, calls } = mockFetch({ '/search': [record({ syncedLyrics: '[00:02.00]שלום' })] });
    const result = await fetchLyrics({ title: 'שיר', artist: 'זמר', durationSec: 200 }, fn);
    expect(result).toEqual({ kind: 'synced', lines: [{ time: 2, text: 'שלום' }] });
    expect(calls[1]).toContain(`track_name=${encodeURIComponent('שיר')}`);
  });

  it('returns plain lyrics when nothing synced exists', async () => {
    const { fn } = mockFetch({ '/search': [record({ plainLyrics: 'words' })] });
    expect(await fetchLyrics({ title: 'Song', artist: 'Artist', durationSec: 200 }, fn)).toEqual({
      kind: 'plain',
      text: 'words',
    });
  });

  it('returns notFound when every pass misses', async () => {
    const { fn, calls } = mockFetch({ '/search': [] });
    expect(await fetchLyrics({ title: 'Artist - Song', artist: '' }, fn)).toEqual({ kind: 'notFound' });
    // No artist and no duration: skip /get, try the title split, then free text.
    expect(calls.map((url) => new URL(url).pathname)).toEqual(['/api/search', '/api/search']);
  });

  it('throws on errors that are not worth retrying', async () => {
    const fn = jest.fn(async () => ({ ok: false, status: 400, json: async () => null })) as unknown as typeof fetch;
    await expect(fetchLyrics({ title: 'Song', artist: 'Artist' }, fn)).rejects.toThrow('400');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('fetchLyrics title-only pass', () => {
  // LRCLIB stores the artist as "ערן צור"; Spotify reports "Eran Tzur".
  function hebrewArtistFetch(duration: number) {
    const calls: string[] = [];
    const fn = jest.fn(async (url: string) => {
      calls.push(url);
      const params = new URL(url).searchParams;
      const titleOnly = url.includes('/search') && params.has('track_name') && !params.has('artist_name');
      const body = titleOnly
        ? [record({ trackName: 'הוא והיא', artistName: 'ערן צור', duration, syncedLyrics: '[00:23.49]הוא והיא' })]
        : url.includes('/search')
          ? []
          : undefined;
      return { ok: body !== undefined, status: body === undefined ? 404 : 200, json: async () => body };
    });
    return { fn: fn as unknown as typeof fetch, calls };
  }

  it('finds a song whose artist is stored in the other script', async () => {
    const { fn } = hebrewArtistFetch(240.53);
    const result = await fetchLyrics({ title: 'הוא והיא', artist: 'Eran Tzur', durationSec: 241 }, fn);
    expect(result).toEqual({ kind: 'synced', lines: [{ time: 23.49, text: 'הוא והיא' }] });
  });

  it('rejects a title-only match whose length differs by more than 2 s', async () => {
    const { fn } = hebrewArtistFetch(244);
    expect(await fetchLyrics({ title: 'הוא והיא', artist: 'Eran Tzur', durationSec: 241 }, fn)).toEqual({
      kind: 'notFound',
    });
  });

  it('skips the title-only pass without a duration', async () => {
    const { fn, calls } = hebrewArtistFetch(241);
    await fetchLyrics({ title: 'הוא והיא', artist: 'Eran Tzur' }, fn);
    expect(calls.some((url) => !new URL(url).searchParams.has('artist_name') && url.includes('track_name'))).toBe(
      false,
    );
  });
});

describe('fetchLyrics retries', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('retries when LRCLIB is busy, then succeeds', async () => {
    let calls = 0;
    const fn = jest.fn(async () => {
      calls++;
      if (calls < 3) return { ok: false, status: 503, json: async () => null };
      return { ok: true, status: 200, json: async () => record({ syncedLyrics: '[00:01.00]Hi' }) };
    }) as unknown as typeof fetch;

    const pending = fetchLyrics({ title: 'Song', artist: 'Artist', durationSec: 200 }, fn);
    await jest.advanceTimersByTimeAsync(4000);
    expect(await pending).toEqual({ kind: 'synced', lines: [{ time: 1, text: 'Hi' }] });
    expect(calls).toBe(3);
  });

  it('gives up after the last retry', async () => {
    const fn = jest.fn(async () => ({ ok: false, status: 503, json: async () => null })) as unknown as typeof fetch;
    const pending = fetchLyrics({ title: 'Song', artist: 'Artist', durationSec: 200 }, fn);
    const assertion = expect(pending).rejects.toThrow('503');
    await jest.advanceTimersByTimeAsync(4000);
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
