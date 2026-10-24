import { findActiveIndex, parseLrc } from '../lrc';

describe('parseLrc', () => {
  it('parses timestamps in several formats and sorts lines', () => {
    const lrc = ['[ar:Someone]', '[00:12.50]Second', '[00:01.00]First', '[01:02]Third', '[01:03.123]Fourth'].join('\n');
    expect(parseLrc(lrc)).toEqual([
      { time: 1, text: 'First' },
      { time: 12.5, text: 'Second' },
      { time: 62, text: 'Third' },
      { time: 63.123, text: 'Fourth' },
    ]);
  });

  it('expands a line with several time tags', () => {
    expect(parseLrc('[00:10.00][00:30.00]Chorus')).toEqual([
      { time: 10, text: 'Chorus' },
      { time: 30, text: 'Chorus' },
    ]);
  });

  it('keeps blank lines as instrumental gaps and brackets inside the text', () => {
    expect(parseLrc('[00:05.00]\n[00:06.00]Hello [world]')).toEqual([
      { time: 5, text: '' },
      { time: 6, text: 'Hello [world]' },
    ]);
  });

  it('applies the offset tag', () => {
    expect(parseLrc('[offset:+500]\n[00:10.00]Line')).toEqual([{ time: 9.5, text: 'Line' }]);
  });

  it('handles Windows line endings and Hebrew text', () => {
    expect(parseLrc('[00:01.00]שלום עולם\r\n[00:02.00]Next')).toEqual([
      { time: 1, text: 'שלום עולם' },
      { time: 2, text: 'Next' },
    ]);
  });
});

describe('findActiveIndex', () => {
  const lines = [
    { time: 1, text: 'a' },
    { time: 5, text: 'b' },
    { time: 9, text: 'c' },
  ];

  it.each([
    [0, -1],
    [1, 0],
    [4.99, 0],
    [5, 1],
    [100, 2],
  ])('at %s s returns %s', (time, expected) => {
    expect(findActiveIndex(lines, time)).toBe(expected);
  });

  it('returns -1 for no lines', () => {
    expect(findActiveIndex([], 10)).toBe(-1);
  });
});
