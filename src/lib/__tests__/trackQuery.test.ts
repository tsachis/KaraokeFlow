import { cleanTitle, primaryArtist, splitArtistFromTitle } from '../trackQuery';

describe('cleanTitle', () => {
  it.each([
    ['Come Together - Remastered 2009', 'Come Together'],
    ['Blinding Lights (feat. Someone)', 'Blinding Lights'],
    ['Song Name [Official Video]', 'Song Name'],
    ['Song ft. Other Artist', 'Song'],
    ['Song - Live at Wembley', 'Song'],
    ['Plain Title', 'Plain Title'],
    ['שיר בעברית (Remastered)', 'שיר בעברית'],
    ['Under Pressure - 2011 Mix', 'Under Pressure'],
  ])('%s -> %s', (input, expected) => {
    expect(cleanTitle(input)).toBe(expected);
  });

  it('never returns an empty string', () => {
    expect(cleanTitle('(Live)')).toBe('(Live)');
  });
});

describe('primaryArtist', () => {
  it.each([
    ['Queen & David Bowie', 'Queen'],
    ['Artist A, Artist B', 'Artist A'],
    ['Artist feat. Guest', 'Artist'],
    ['Omer Adam - Topic', 'Omer Adam'],
    ['Solo', 'Solo'],
  ])('%s -> %s', (input, expected) => {
    expect(primaryArtist(input)).toBe(expected);
  });
});

describe('splitArtistFromTitle', () => {
  it('splits "Artist - Song"', () => {
    expect(splitArtistFromTitle('Queen - Bohemian Rhapsody')).toEqual({ artist: 'Queen', title: 'Bohemian Rhapsody' });
  });

  it('returns null without a separator', () => {
    expect(splitArtistFromTitle('Bohemian Rhapsody')).toBeNull();
  });
});
