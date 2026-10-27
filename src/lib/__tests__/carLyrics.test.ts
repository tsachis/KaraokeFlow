import { toCarLyrics } from '../carLyrics';

describe('toCarLyrics', () => {
  it('is null without a track', () => {
    expect(toCarLyrics(null, { status: 'idle' })).toBeNull();
    expect(toCarLyrics('', { status: 'loading' })).toBeNull();
  });

  it('sends synced lines in ms with direction marks; blank lines stay blank', () => {
    const lines = [
      { time: 1.234, text: 'Hello' },
      { time: 5, text: '' },
      { time: 7.5, text: 'שלום' },
    ];
    expect(toCarLyrics('Song', { status: 'ready', result: { kind: 'synced', lines } })).toEqual({
      title: 'Song',
      lines: [
        { timeMs: 1234, text: '‎Hello' },
        { timeMs: 5000, text: '' },
        { timeMs: 7500, text: '‏שלום' },
      ],
      message: null,
    });
  });

  it('sends a message when there are no synced lines', () => {
    expect(toCarLyrics('Song', { status: 'loading' })).toEqual({ title: 'Song', lines: [], message: 'Finding lyrics...' });
    expect(toCarLyrics('Song', { status: 'ready', result: { kind: 'notFound' } })?.message).toBe('No lyrics found');
  });
});
