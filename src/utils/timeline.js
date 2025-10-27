/**
 * Timeline Utility Functions
 *
 * Provides core functionality for timeline coordinate conversion, snapping,
 * and time calculations for the Konva-based timeline editor.
 */

// Timeline configuration constants
export const TIMELINE_CONFIG = {
  PIXELS_PER_SECOND: 100, // Default zoom level: 100 pixels = 1 second
  MIN_ZOOM: 10,           // Minimum pixels per second (zoomed out)
  MAX_ZOOM: 500,          // Maximum pixels per second (zoomed in)
  ZOOM_STEP: 1.2,         // Zoom multiplier for each scroll step
  SNAP_THRESHOLD: 10,     // Pixels within which snapping occurs
  TRACK_HEIGHT: 80,       // Height of each timeline track
  RULER_HEIGHT: 40,       // Height of the time ruler
  PLAYHEAD_WIDTH: 2,      // Width of the playhead line
};

/**
 * Convert time in seconds to pixel position on timeline
 * @param {number} timeInSeconds - Time in seconds
 * @param {number} pixelsPerSecond - Current zoom level (pixels per second)
 * @returns {number} Pixel position
 */
export function timeToPixels(timeInSeconds, pixelsPerSecond = TIMELINE_CONFIG.PIXELS_PER_SECOND) {
  return timeInSeconds * pixelsPerSecond;
}

/**
 * Convert pixel position to time in seconds
 * @param {number} pixels - Pixel position on timeline
 * @param {number} pixelsPerSecond - Current zoom level (pixels per second)
 * @returns {number} Time in seconds
 */
export function pixelsToTime(pixels, pixelsPerSecond = TIMELINE_CONFIG.PIXELS_PER_SECOND) {
  return pixels / pixelsPerSecond;
}

/**
 * Format time in seconds to MM:SS or HH:MM:SS format
 * @param {number} timeInSeconds - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatTime(timeInSeconds) {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Snap a pixel position to the nearest snap point (e.g., clip edge, grid line)
 * @param {number} position - Current pixel position
 * @param {number[]} snapPoints - Array of pixel positions to snap to
 * @param {number} threshold - Distance within which snapping occurs
 * @returns {number} Snapped position or original position if no snap point nearby
 */
export function snapToPoints(position, snapPoints, threshold = TIMELINE_CONFIG.SNAP_THRESHOLD) {
  for (const snapPoint of snapPoints) {
    if (Math.abs(position - snapPoint) <= threshold) {
      return snapPoint;
    }
  }
  return position;
}

/**
 * Calculate snap points for clips (edges of existing clips on the timeline)
 * @param {Array} clips - Array of clip objects with startTime and duration properties
 * @param {number} pixelsPerSecond - Current zoom level
 * @returns {number[]} Array of snap point pixel positions
 */
export function getClipSnapPoints(clips, pixelsPerSecond = TIMELINE_CONFIG.PIXELS_PER_SECOND) {
  const snapPoints = [0]; // Timeline start is always a snap point

  clips.forEach(clip => {
    const startX = timeToPixels(clip.startTime, pixelsPerSecond);
    const endX = timeToPixels(clip.startTime + clip.duration, pixelsPerSecond);
    snapPoints.push(startX, endX);
  });

  return snapPoints;
}

/**
 * Calculate which track a Y position corresponds to
 * @param {number} y - Y coordinate (relative to timeline canvas)
 * @param {number} trackHeight - Height of each track
 * @param {number} rulerHeight - Height of the ruler area
 * @returns {number} Track index (0-based), or -1 if in ruler area
 */
export function getTrackIndexFromY(y, trackHeight = TIMELINE_CONFIG.TRACK_HEIGHT, rulerHeight = TIMELINE_CONFIG.RULER_HEIGHT) {
  if (y < rulerHeight) {
    return -1; // In ruler area
  }
  return Math.floor((y - rulerHeight) / trackHeight);
}

/**
 * Calculate Y position for a given track index
 * @param {number} trackIndex - Track index (0-based)
 * @param {number} trackHeight - Height of each track
 * @param {number} rulerHeight - Height of the ruler area
 * @returns {number} Y pixel position
 */
export function getTrackY(trackIndex, trackHeight = TIMELINE_CONFIG.TRACK_HEIGHT, rulerHeight = TIMELINE_CONFIG.RULER_HEIGHT) {
  return rulerHeight + (trackIndex * trackHeight);
}

/**
 * Apply zoom change to pixels per second value
 * @param {number} currentPixelsPerSecond - Current zoom level
 * @param {number} zoomDelta - Positive for zoom in, negative for zoom out
 * @returns {number} New pixels per second value, clamped to min/max
 */
export function applyZoom(currentPixelsPerSecond, zoomDelta) {
  let newZoom = currentPixelsPerSecond;

  if (zoomDelta > 0) {
    newZoom *= TIMELINE_CONFIG.ZOOM_STEP;
  } else if (zoomDelta < 0) {
    newZoom /= TIMELINE_CONFIG.ZOOM_STEP;
  }

  // Clamp to min/max zoom levels
  return Math.max(
    TIMELINE_CONFIG.MIN_ZOOM,
    Math.min(TIMELINE_CONFIG.MAX_ZOOM, newZoom)
  );
}

/**
 * Calculate ruler tick marks for the time ruler
 * @param {number} viewportWidth - Width of visible timeline area in pixels
 * @param {number} scrollX - Horizontal scroll position
 * @param {number} pixelsPerSecond - Current zoom level
 * @returns {Array} Array of tick objects with {time, x, isMajor} properties
 */
export function calculateRulerTicks(viewportWidth, scrollX, pixelsPerSecond = TIMELINE_CONFIG.PIXELS_PER_SECOND) {
  const ticks = [];

  // Determine tick interval based on zoom level
  let majorInterval; // seconds between major ticks
  let minorInterval; // seconds between minor ticks

  if (pixelsPerSecond >= 200) {
    // Very zoomed in: 1s major, 0.2s minor
    majorInterval = 1;
    minorInterval = 0.2;
  } else if (pixelsPerSecond >= 50) {
    // Medium zoom: 5s major, 1s minor
    majorInterval = 5;
    minorInterval = 1;
  } else {
    // Zoomed out: 10s major, 2s minor
    majorInterval = 10;
    minorInterval = 2;
  }

  const startTime = pixelsToTime(scrollX, pixelsPerSecond);
  const endTime = pixelsToTime(scrollX + viewportWidth, pixelsPerSecond);

  // Round start time down to nearest minor interval
  const firstTick = Math.floor(startTime / minorInterval) * minorInterval;

  for (let time = firstTick; time <= endTime + minorInterval; time += minorInterval) {
    const x = timeToPixels(time, pixelsPerSecond);
    const isMajor = Math.abs(time % majorInterval) < 0.01; // Handle floating point precision

    ticks.push({
      time,
      x,
      isMajor,
      label: isMajor ? formatTime(time) : null
    });
  }

  return ticks;
}

/**
 * Check if two clips overlap on the timeline
 * @param {Object} clip1 - First clip with startTime and duration
 * @param {Object} clip2 - Second clip with startTime and duration
 * @returns {boolean} True if clips overlap
 */
export function clipsOverlap(clip1, clip2) {
  const clip1End = clip1.startTime + clip1.duration;
  const clip2End = clip2.startTime + clip2.duration;

  return !(clip1End <= clip2.startTime || clip2End <= clip1.startTime);
}

/**
 * Constrain clip position to prevent overlaps
 * @param {Object} clip - Clip being moved with startTime, duration, track
 * @param {Array} existingClips - Array of existing clips
 * @returns {number} Constrained start time
 */
export function constrainClipPosition(clip, existingClips) {
  // Find clips on the same track
  const sameTrackClips = existingClips.filter(c =>
    c.id !== clip.id && c.track === clip.track
  );

  // For now, return original position
  // TODO: Implement collision detection and automatic adjustment
  return clip.startTime;
}
