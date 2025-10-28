/**
 * Unit Tests for Timeline Utilities
 *
 * Tests for src/utils/timeline.js - coordinate conversion, snapping, and timeline calculations
 */

import { describe, it, expect } from 'vitest';
import {
  TIMELINE_CONFIG,
  timeToPixels,
  pixelsToTime,
  formatTime,
  snapToPoints,
  getClipSnapPoints,
  getTrackIndexFromY,
  getTrackY,
  applyZoom,
  clipsOverlap,
  splitClipAtTime,
  calculateRulerTicks,
} from './timeline.js';

describe('Timeline Utilities', () => {
  describe('timeToPixels', () => {
    it('converts time to pixels with default zoom (100 px/s)', () => {
      expect(timeToPixels(0)).toBe(0);
      expect(timeToPixels(1)).toBe(100);
      expect(timeToPixels(5)).toBe(500);
      expect(timeToPixels(10.5)).toBe(1050);
    });

    it('converts time to pixels with custom pixelsPerSecond', () => {
      expect(timeToPixels(1, 50)).toBe(50);
      expect(timeToPixels(2, 200)).toBe(400);
      expect(timeToPixels(5, 25)).toBe(125);
    });
  });

  describe('pixelsToTime', () => {
    it('converts pixels to time with default zoom (100 px/s)', () => {
      expect(pixelsToTime(0)).toBe(0);
      expect(pixelsToTime(100)).toBe(1);
      expect(pixelsToTime(500)).toBe(5);
      expect(pixelsToTime(1050)).toBe(10.5);
    });

    it('converts pixels to time with custom pixelsPerSecond', () => {
      expect(pixelsToTime(50, 50)).toBe(1);
      expect(pixelsToTime(400, 200)).toBe(2);
      expect(pixelsToTime(125, 25)).toBe(5);
    });
  });

  describe('formatTime', () => {
    it('formats seconds to MM:SS for times under 1 hour', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(5)).toBe('00:05');
      expect(formatTime(30)).toBe('00:30');
      expect(formatTime(65)).toBe('01:05');
      expect(formatTime(125)).toBe('02:05');
      expect(formatTime(3599)).toBe('59:59');
    });

    it('formats seconds to HH:MM:SS for times over 1 hour', () => {
      expect(formatTime(3600)).toBe('01:00:00');
      expect(formatTime(3661)).toBe('01:01:01');
      expect(formatTime(7200)).toBe('02:00:00');
      expect(formatTime(7325)).toBe('02:02:05');
      expect(formatTime(36000)).toBe('10:00:00');
    });

    it('handles fractional seconds by flooring', () => {
      expect(formatTime(1.9)).toBe('00:01');
      expect(formatTime(59.999)).toBe('00:59');
      expect(formatTime(125.7)).toBe('02:05');
    });
  });

  describe('snapToPoints', () => {
    it('snaps to nearest point within threshold', () => {
      const snapPoints = [0, 100, 200, 500];
      const threshold = 10;

      expect(snapToPoints(5, snapPoints, threshold)).toBe(0); // Within 10px of 0
      expect(snapToPoints(95, snapPoints, threshold)).toBe(100); // Within 10px of 100
      expect(snapToPoints(105, snapPoints, threshold)).toBe(100); // Within 10px of 100
      expect(snapToPoints(195, snapPoints, threshold)).toBe(200); // Within 10px of 200
      expect(snapToPoints(505, snapPoints, threshold)).toBe(500); // Within 10px of 500
    });

    it('returns original position when no snap points nearby', () => {
      const snapPoints = [0, 100, 200, 500];
      const threshold = 10;

      expect(snapToPoints(50, snapPoints, threshold)).toBe(50); // No snap point within 10px
      expect(snapToPoints(150, snapPoints, threshold)).toBe(150); // Between 100 and 200
      expect(snapToPoints(300, snapPoints, threshold)).toBe(300); // Between 200 and 500
    });

    it('uses default threshold from TIMELINE_CONFIG', () => {
      const snapPoints = [0, 100];
      expect(snapToPoints(5, snapPoints)).toBe(0); // Default threshold is 10
      expect(snapToPoints(20, snapPoints)).toBe(20); // Outside default threshold
    });
  });

  describe('getClipSnapPoints', () => {
    it('includes timeline start (0) as a snap point', () => {
      const clips = [];
      const snapPoints = getClipSnapPoints(clips);
      expect(snapPoints).toContain(0);
      expect(snapPoints).toHaveLength(1);
    });

    it('calculates clip start and end snap positions', () => {
      const clips = [
        { startTime: 1, duration: 2 }, // Start: 100px, End: 300px
        { startTime: 5, duration: 3 }, // Start: 500px, End: 800px
      ];
      const snapPoints = getClipSnapPoints(clips, 100);

      expect(snapPoints).toContain(0); // Timeline start
      expect(snapPoints).toContain(100); // Clip 1 start
      expect(snapPoints).toContain(300); // Clip 1 end
      expect(snapPoints).toContain(500); // Clip 2 start
      expect(snapPoints).toContain(800); // Clip 2 end
      expect(snapPoints).toHaveLength(5);
    });

    it('handles custom pixelsPerSecond', () => {
      const clips = [{ startTime: 2, duration: 4 }];
      const snapPoints = getClipSnapPoints(clips, 50); // 50 px/s

      expect(snapPoints).toContain(0); // Timeline start
      expect(snapPoints).toContain(100); // Start: 2s * 50px/s = 100px
      expect(snapPoints).toContain(300); // End: 6s * 50px/s = 300px
    });
  });

  describe('getTrackIndexFromY', () => {
    it('returns -1 for ruler area', () => {
      expect(getTrackIndexFromY(0)).toBe(-1);
      expect(getTrackIndexFromY(20)).toBe(-1);
      expect(getTrackIndexFromY(39)).toBe(-1); // Just below ruler
    });

    it('calculates correct track index for tracks', () => {
      expect(getTrackIndexFromY(40)).toBe(0); // Track 0 starts at ruler height (40)
      expect(getTrackIndexFromY(80)).toBe(0); // Still in track 0
      expect(getTrackIndexFromY(120)).toBe(1); // Track 1 (40 + 80)
      expect(getTrackIndexFromY(200)).toBe(2); // Track 2 (40 + 160)
      expect(getTrackIndexFromY(280)).toBe(3); // Track 3
    });

    it('handles custom track height and ruler height', () => {
      expect(getTrackIndexFromY(100, 100, 50)).toBe(0); // Ruler: 50, Track height: 100
      expect(getTrackIndexFromY(200, 100, 50)).toBe(1); // Track 1 starts at 150
    });
  });

  describe('getTrackY', () => {
    it('calculates Y position for track index', () => {
      expect(getTrackY(0)).toBe(40); // Track 0 at ruler height
      expect(getTrackY(1)).toBe(120); // Track 1 at 40 + 80
      expect(getTrackY(2)).toBe(200); // Track 2 at 40 + 160
      expect(getTrackY(3)).toBe(280); // Track 3 at 40 + 240
    });

    it('handles custom track height and ruler height', () => {
      expect(getTrackY(0, 100, 50)).toBe(50); // Ruler: 50, Track height: 100
      expect(getTrackY(1, 100, 50)).toBe(150); // Track 1 at 50 + 100
      expect(getTrackY(2, 100, 50)).toBe(250); // Track 2 at 50 + 200
    });
  });

  describe('applyZoom', () => {
    it('applies zoom in correctly (positive delta)', () => {
      const current = 100;
      const zoomIn = applyZoom(current, 1);
      expect(zoomIn).toBe(current * TIMELINE_CONFIG.ZOOM_STEP); // 100 * 1.2 = 120
    });

    it('applies zoom out correctly (negative delta)', () => {
      const current = 120;
      const zoomOut = applyZoom(current, -1);
      expect(zoomOut).toBeCloseTo(100, 5); // 120 / 1.2 = 100
    });

    it('returns same zoom for zero delta', () => {
      const current = 100;
      expect(applyZoom(current, 0)).toBe(100);
    });

    it('clamps zoom to MIN_ZOOM', () => {
      const current = 11;
      const zoomOut = applyZoom(current, -1); // Would be 11 / 1.2 = 9.166..., clamped to 10
      expect(zoomOut).toBe(TIMELINE_CONFIG.MIN_ZOOM); // Clamped to 10
    });

    it('clamps zoom to MAX_ZOOM', () => {
      const current = 450;
      const zoomIn = applyZoom(current, 1); // Would be 450 * 1.2 = 540
      expect(zoomIn).toBe(TIMELINE_CONFIG.MAX_ZOOM); // Clamped to 500
    });
  });

  describe('clipsOverlap', () => {
    it('detects overlapping clips', () => {
      const clip1 = { startTime: 1, duration: 3 }; // 1-4s
      const clip2 = { startTime: 2, duration: 3 }; // 2-5s
      expect(clipsOverlap(clip1, clip2)).toBe(true);
    });

    it('detects partial overlap at start', () => {
      const clip1 = { startTime: 1, duration: 2 }; // 1-3s
      const clip2 = { startTime: 2, duration: 2 }; // 2-4s
      expect(clipsOverlap(clip1, clip2)).toBe(true);
    });

    it('detects partial overlap at end', () => {
      const clip1 = { startTime: 5, duration: 3 }; // 5-8s
      const clip2 = { startTime: 3, duration: 3 }; // 3-6s
      expect(clipsOverlap(clip1, clip2)).toBe(true);
    });

    it('detects non-overlapping clips (adjacent)', () => {
      const clip1 = { startTime: 1, duration: 2 }; // 1-3s
      const clip2 = { startTime: 3, duration: 2 }; // 3-5s
      expect(clipsOverlap(clip1, clip2)).toBe(false); // Edge-to-edge, not overlapping
    });

    it('detects non-overlapping clips (separated)', () => {
      const clip1 = { startTime: 1, duration: 2 }; // 1-3s
      const clip2 = { startTime: 5, duration: 2 }; // 5-7s
      expect(clipsOverlap(clip1, clip2)).toBe(false);
    });

    it('detects clip1 fully contains clip2', () => {
      const clip1 = { startTime: 1, duration: 10 }; // 1-11s
      const clip2 = { startTime: 3, duration: 2 }; // 3-5s
      expect(clipsOverlap(clip1, clip2)).toBe(true);
    });
  });

  describe('splitClipAtTime', () => {
    it('splits clip correctly at valid position', () => {
      const clip = {
        id: 1,
        startTime: 2,
        duration: 6,
        inPoint: 10,
        outPoint: 16,
        track: 0,
        mediaId: 'media-1',
      };

      const result = splitClipAtTime(clip, 5); // Split at 5s (3s into clip)

      expect(result).not.toBeNull();
      expect(result.firstClip).toMatchObject({
        startTime: 2,
        duration: 3, // 5 - 2 = 3
        inPoint: 10,
        outPoint: 13, // 10 + 3 = 13
        track: 0,
        mediaId: 'media-1',
      });
      expect(result.secondClip).toMatchObject({
        startTime: 5,
        duration: 3, // 6 - 3 = 3
        inPoint: 13, // 10 + 3 = 13
        outPoint: 16, // Original outPoint
        track: 0,
        mediaId: 'media-1',
      });
    });

    it('returns null for split at start edge', () => {
      const clip = { startTime: 2, duration: 6, inPoint: 0, outPoint: 6 };
      const result = splitClipAtTime(clip, 2); // Split at start
      expect(result).toBeNull();
    });

    it('returns null for split at end edge', () => {
      const clip = { startTime: 2, duration: 6, inPoint: 0, outPoint: 6 };
      const result = splitClipAtTime(clip, 8); // Split at end (2 + 6 = 8)
      expect(result).toBeNull();
    });

    it('returns null for split before clip', () => {
      const clip = { startTime: 2, duration: 6, inPoint: 0, outPoint: 6 };
      const result = splitClipAtTime(clip, 1); // Split before clip
      expect(result).toBeNull();
    });

    it('returns null for split after clip', () => {
      const clip = { startTime: 2, duration: 6, inPoint: 0, outPoint: 6 };
      const result = splitClipAtTime(clip, 10); // Split after clip
      expect(result).toBeNull();
    });

    it('maintains clip continuity (no gaps or overlaps)', () => {
      const clip = {
        startTime: 0,
        duration: 10,
        inPoint: 5,
        outPoint: 15,
        track: 1,
      };

      const result = splitClipAtTime(clip, 4); // Split at 4s

      expect(result).not.toBeNull();
      // First clip ends where second clip begins
      expect(result.firstClip.startTime + result.firstClip.duration).toBe(
        result.secondClip.startTime
      );
      // In-point of second clip equals out-point of first clip
      expect(result.firstClip.outPoint).toBe(result.secondClip.inPoint);
      // Total duration preserved
      expect(result.firstClip.duration + result.secondClip.duration).toBe(10);
    });
  });

  describe('calculateRulerTicks', () => {
    it('generates ticks with correct intervals for high zoom (>=200 px/s)', () => {
      const ticks = calculateRulerTicks(1000, 0, 200); // 1000px viewport, 200 px/s
      // At 200 px/s: major interval 1s, minor interval 0.2s
      const majorTicks = ticks.filter(t => t.isMajor);
      const minorTicks = ticks.filter(t => !t.isMajor);

      expect(majorTicks.length).toBeGreaterThan(0);
      expect(minorTicks.length).toBeGreaterThan(0);
      expect(ticks[0].time).toBeGreaterThanOrEqual(0);
    });

    it('generates ticks with correct intervals for medium zoom (>=50 px/s)', () => {
      const ticks = calculateRulerTicks(1000, 0, 100); // 1000px viewport, 100 px/s
      // At 100 px/s: major interval 5s, minor interval 1s
      const majorTicks = ticks.filter(t => t.isMajor);

      expect(majorTicks.length).toBeGreaterThan(0);
      expect(ticks.length).toBeGreaterThan(majorTicks.length); // Should have minor ticks too
    });

    it('generates ticks with correct intervals for low zoom (<50 px/s)', () => {
      const ticks = calculateRulerTicks(1000, 0, 25); // 1000px viewport, 25 px/s
      // At 25 px/s: major interval 10s, minor interval 2s
      const majorTicks = ticks.filter(t => t.isMajor);

      expect(majorTicks.length).toBeGreaterThan(0);
      expect(ticks.length).toBeGreaterThan(majorTicks.length);
    });

    it('includes labels for major ticks only', () => {
      const ticks = calculateRulerTicks(500, 0, 100);
      const majorTicks = ticks.filter(t => t.isMajor);
      const minorTicks = ticks.filter(t => !t.isMajor);

      majorTicks.forEach(tick => {
        expect(tick.label).toBeTruthy(); // Major ticks should have labels
      });

      minorTicks.forEach(tick => {
        expect(tick.label).toBeNull(); // Minor ticks should not have labels
      });
    });

    it('adjusts ticks based on scroll position', () => {
      const ticks1 = calculateRulerTicks(500, 0, 100); // No scroll
      const ticks2 = calculateRulerTicks(500, 1000, 100); // Scrolled 1000px right

      expect(ticks1[0].time).toBe(0);
      expect(ticks2[0].time).toBeGreaterThan(5); // Should start later than first viewport
    });
  });
});
