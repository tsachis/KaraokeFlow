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

  it('throws on server errors', async () => {
    const fn = jest.fn(async () => ({ ok: false, status: 500, json: async () => null })) as unknown as typeof fetch;
    await expect(fetchLyrics({ title: 'Song', artist: 'Artist' }, fn)).rejects.toThrow('500');
  });
});
