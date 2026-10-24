import { isRtl, withDirectionMark } from '../textDirection';

describe('isRtl', () => {
  it.each([
    ['שלום עולם', true],
    ['Hello world', false],
    ['Love את הלילה הזה', true],
    ['Hello שלום everyone', false],
    ['123 ...', false],
    ['مرحبا', true],
  ])('%s -> %s', (text, expected) => {
    expect(isRtl(text)).toBe(expected);
  });
});

describe('withDirectionMark', () => {
  it('adds RLM to RTL text and LRM to LTR text', () => {
    expect(withDirectionMark('שלום')).toBe('‏שלום');
    expect(withDirectionMark('Hi')).toBe('‎Hi');
    expect(withDirectionMark('')).toBe('');
  });
});
