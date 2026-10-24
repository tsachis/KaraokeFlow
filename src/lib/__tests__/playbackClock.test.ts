import { estimatePositionSec, type PlaybackSnapshot } from '../playbackClock';

const base: PlaybackSnapshot = {
  positionMs: 10_000,
  positionUpdatedAt: 1_000_000,
  playbackSpeed: 1,
  isPlaying: true,
  durationMs: 200_000,
};

describe('estimatePositionSec', () => {
  it('extrapolates while playing', () => {
    expect(estimatePositionSec(base, 1_002_500)).toBe(12.5);
  });

  it('holds still while paused', () => {
    expect(estimatePositionSec({ ...base, isPlaying: false }, 1_050_000)).toBe(10);
  });

  it('applies playback speed and user offset', () => {
    expect(estimatePositionSec({ ...base, playbackSpeed: 2 }, 1_001_000, 500)).toBe(12.5);
  });

  it('treats speed 0 while playing as normal speed', () => {
    expect(estimatePositionSec({ ...base, playbackSpeed: 0 }, 1_001_000)).toBe(11);
  });

  it('clamps to the track duration and to zero', () => {
    expect(estimatePositionSec(base, 9_000_000)).toBe(200);
    expect(estimatePositionSec({ ...base, positionMs: 0 }, 1_000_000, -2000)).toBe(0);
  });
});
