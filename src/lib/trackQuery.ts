export interface TrackQuery {
  title: string;
  artist: string;
  album?: string;
  durationSec?: number;
}

const NOISE_IN_BRACKETS = /\s*[([][^)\]]*(feat\.?|ft\.?|with|remaster(ed)?|live|version|edit|mix|mono|stereo|official|video|audio|lyrics?|explicit|clean|hd|4k)[^)\]]*[)\]]/gi;
const NOISE_AFTER_DASH = /\s+-\s+.*(remaster(ed)?|live|version|edit|mix|mono|stereo|single|radio).*$/i;
const FEAT_TAIL = /\s+(feat\.?|ft\.?|featuring)\s+.*$/i;
const ARTIST_SEPARATOR = /\s*(,|&|\bx\b|\band\b|\/|;|\bfeat\.?|\bft\.?|\bfeaturing\b)\s*/i;
const YOUTUBE_TOPIC = /\s+-\s+Topic$/i;

/** Strips "(Remastered 2011)", "- Live", "feat. X" and similar from a track title. */
export function cleanTitle(title: string): string {
  const cleaned = title
    .replace(NOISE_IN_BRACKETS, '')
    .replace(NOISE_AFTER_DASH, '')
    .replace(FEAT_TAIL, '')
    .trim();
  return cleaned || title.trim();
}

/** Keeps only the first credited artist. */
export function primaryArtist(artist: string): string {
  const first = artist.replace(YOUTUBE_TOPIC, '').split(ARTIST_SEPARATOR)[0]?.trim();
  return first || artist.trim();
}

/**
 * YouTube videos often have no real artist and a title like "Artist - Song".
 * Returns that split when the title has one, so the lookup has a second chance.
 */
export function splitArtistFromTitle(title: string): { artist: string; title: string } | null {
  const parts = title.split(/\s+[-–—]\s+/);
  if (parts.length < 2) return null;
  const [artist, ...rest] = parts;
  return { artist: artist.trim(), title: rest.join(' - ').trim() };
}
