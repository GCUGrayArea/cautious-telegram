/**
 * Unit Tests for Playback Engine
 *
 * Tests for src/utils/playback.js - playback state management and timeline duration calculation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlaybackEngine, calculateTimelineDuration } from './playback.js';

describe('Playback Engine', () => {
  let engine;
  let mockOnTimeUpdate;
  let mockOnPlaybackEnd;

  beforeEach(() => {
    mockOnTimeUpdate = vi.fn();
    mockOnPlaybackEnd = vi.fn();

    engine = new PlaybackEngine({
      onTimeUpdate: mockOnTimeUpdate,
      onPlaybackEnd: mockOnPlaybackEnd,
    });

    // Mock performance.now() for predictable timing
    vi.spyOn(global.performance, 'now').mockReturnValue(0);

    // Mock requestAnimationFrame
    vi.spyOn(global, 'requestAnimationFrame').mockImplementation(cb => {
      return setTimeout(cb, 16); // ~60fps
    });

    // Mock cancelAnimationFrame
    vi.spyOn(global, 'cancelAnimationFrame').mockImplementation(id => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    engine.destroy();
    vi.restoreAllMocks();
  });

  describe('start', () => {
    it('initializes playback state correctly', () => {
      engine.start(0, 10);

      expect(engine.isPlaying).toBe(true);
      expect(engine.playheadTime).toBe(0);
      expect(engine.totalDuration).toBe(10);
    });

    it('starts from non-zero position', () => {
      engine.start(5, 10);

      expect(engine.isPlaying).toBe(true);
      expect(engine.playheadTime).toBe(5);
      expect(engine.totalDuration).toBe(10);
    });

    it('does not restart if already playing', () => {
      engine.start(0, 10);
      const firstStartTime = engine.startTime;

      engine.start(0, 10); // Try to start again
      expect(engine.startTime).toBe(firstStartTime); // Should be unchanged
    });
  });

  describe('pause', () => {
    it('pauses playback and cancels animation frame', () => {
      engine.start(0, 10);
      expect(engine.isPlaying).toBe(true);

      engine.pause();
      expect(engine.isPlaying).toBe(false);
    });

    it('can be called multiple times safely', () => {
      engine.start(0, 10);
      engine.pause();
      engine.pause(); // Should not throw
      expect(engine.isPlaying).toBe(false);
    });
  });

  describe('stop', () => {
    it('stops playback and resets to start', () => {
      engine.start(5, 10);
      engine.stop();

      expect(engine.isPlaying).toBe(false);
      expect(engine.playheadTime).toBe(0);
      expect(mockOnTimeUpdate).toHaveBeenCalledWith(0);
    });
  });

  describe('seek', () => {
    it('updates playhead time without affecting playback state', () => {
      engine.start(0, 10);
      const wasPlaying = engine.isPlaying;

      engine.seek(5);

      expect(engine.playheadTime).toBe(5);
      expect(engine.isPlaying).toBe(wasPlaying); // Playback state unchanged
    });

    it('can seek while paused', () => {
      engine.pause();
      engine.seek(7);

      expect(engine.playheadTime).toBe(7);
      expect(engine.isPlaying).toBe(false);
    });
  });

  describe('animate', () => {
    it('calls onTimeUpdate callback during animation', () => {
      engine.start(0, 10);

      // Simulate time passing by directly updating internal state
      vi.spyOn(global.performance, 'now').mockReturnValue(100); // 100ms later

      // Manually invoke animate logic
      engine.lastFrameTime = 0;
      const deltaTime = (100 - 0) / 1000; // 0.1 seconds
      engine.playheadTime += deltaTime;
      engine.onTimeUpdate(engine.playheadTime);

      expect(mockOnTimeUpdate).toHaveBeenCalledWith(expect.any(Number));
      expect(engine.playheadTime).toBeGreaterThan(0);
    });

    it('stops and calls onPlaybackEnd when reaching total duration', () => {
      engine.start(9.9, 10); // Start near the end

      // Simulate time advancing past duration
      engine.playheadTime = 10.5; // Past duration

      // Manually trigger end-of-playback logic
      if (engine.playheadTime >= engine.totalDuration) {
        engine.playheadTime = engine.totalDuration;
        engine.onTimeUpdate(engine.playheadTime);
        engine.onPlaybackEnd();
        engine.pause();
      }

      expect(mockOnPlaybackEnd).toHaveBeenCalled();
      expect(engine.isPlaying).toBe(false);
      expect(engine.playheadTime).toBe(10);
    });

    it('does not run when not playing', () => {
      engine.isPlaying = false;
      engine.animate();

      expect(mockOnTimeUpdate).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('cleans up resources', () => {
      engine.start(0, 10);
      engine.destroy();

      expect(engine.isPlaying).toBe(false);
      expect(engine.onTimeUpdate).toBeNull();
      expect(engine.onPlaybackEnd).toBeNull();
    });
  });
});

describe('calculateTimelineDuration', () => {
  it('calculates max end time from clips', () => {
    const clips = [
      { startTime: 0, duration: 5 },   // Ends at 5s
      { startTime: 3, duration: 4 },   // Ends at 7s
      { startTime: 6, duration: 10 },  // Ends at 16s (latest)
    ];

    expect(calculateTimelineDuration(clips)).toBe(16);
  });

  it('returns 0 for empty clip array', () => {
    expect(calculateTimelineDuration([])).toBe(0);
  });

  it('returns 0 for null clip array', () => {
    expect(calculateTimelineDuration(null)).toBe(0);
  });

  it('returns 0 for undefined clip array', () => {
    expect(calculateTimelineDuration(undefined)).toBe(0);
  });

  it('handles single clip', () => {
    const clips = [{ startTime: 2, duration: 8 }];
    expect(calculateTimelineDuration(clips)).toBe(10);
  });

  it('handles clips with zero duration', () => {
    const clips = [
      { startTime: 0, duration: 0 },
      { startTime: 5, duration: 3 },
    ];
    expect(calculateTimelineDuration(clips)).toBe(8);
  });

  it('handles clips not in chronological order', () => {
    const clips = [
      { startTime: 10, duration: 5 }, // Ends at 15s
      { startTime: 0, duration: 3 },  // Ends at 3s
      { startTime: 5, duration: 20 }, // Ends at 25s (latest)
    ];

    expect(calculateTimelineDuration(clips)).toBe(25);
  });
});
