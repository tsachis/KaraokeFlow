export interface LyricLine {
  /** Seconds from the start of the track. */
  time: number;
  text: string;
}

const TIME_TAG = /\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g;
const OFFSET_TAG = /^\[offset:\s*([+-]?\d+)\]/i;

/**
 * Parses LRC text into lines sorted by time. A line may carry several time tags
 * ("[00:12.00][01:30.00]chorus"); each becomes its own entry. The [offset:ms] tag
 * is applied (positive offset shows lyrics earlier, per the LRC convention).
 */
export function parseLrc(lrc: string): LyricLine[] {
  let offsetSec = 0;
  const lines: LyricLine[] = [];

  for (const raw of lrc.split(/\r?\n/)) {
    const offset = OFFSET_TAG.exec(raw.trim());
    if (offset) {
      offsetSec = Number(offset[1]) / 1000;
      continue;
    }

    const times: number[] = [];
    let lastIndex = 0;
    TIME_TAG.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TIME_TAG.exec(raw)) !== null) {
      // Tags must be at the start, back to back; later brackets belong to the lyric text.
      if (match.index !== lastIndex) break;
      times.push(Number(match[1]) * 60 + Number(match[2].replace(':', '.')));
      lastIndex = TIME_TAG.lastIndex;
    }
    if (times.length === 0) continue;

    const text = raw.slice(lastIndex).trim();
    for (const time of times) lines.push({ time, text });
  }

  return lines
    .map((line) => ({ ...line, time: Math.max(0, line.time - offsetSec) }))
    .sort((a, b) => a.time - b.time);
}

/** Index of the line playing at `time`, or -1 before the first line. */
export function findActiveIndex(lines: readonly LyricLine[], time: number): number {
  let low = 0;
  let high = lines.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lines[mid].time <= time) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}
