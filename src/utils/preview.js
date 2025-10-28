/**
 * Preview Utilities
 *
 * Helper functions for video preview player to calculate which clip(s)
 * are visible at the playhead position and what time offset to use.
 */

/**
 * Find the clip that should be displayed at the given time on the primary track (track 0)
 *
 * @param {Array} clips - Array of clip objects from timeline
 * @param {number} currentTime - Current playhead time in seconds
 * @returns {Object|null} The clip object at the current time, or null if none
 */
export function getClipAtTime(clips, currentTime) {
  // Filter to track 0 clips (primary video track)
  const track0Clips = clips.filter(clip => clip.track === 0);

  // Find clip that contains the current time
  return track0Clips.find(clip => {
    const clipEndTime = clip.startTime + clip.duration;
    return currentTime >= clip.startTime && currentTime < clipEndTime;
  }) || null;
}

/**
 * Calculate the time offset within the source video file
 * Takes into account the clip's position on timeline and its in/out points
 *
 * @param {Object} clip - The clip object
 * @param {number} currentTime - Current playhead time in seconds
 * @returns {number} The time offset within the source video file in seconds
 */
export function getClipSourceTime(clip, currentTime) {
  if (!clip) return 0;

  // Calculate how far into the clip we are on the timeline
  const timeIntoClip = currentTime - clip.startTime;

  // Add the in-point to get the actual time in the source file
  const sourceTime = clip.inPoint + timeIntoClip;

  // Clamp to valid range (between inPoint and outPoint)
  return Math.max(clip.inPoint, Math.min(sourceTime, clip.outPoint));
}

/**
 * Get all clips at the current time across all tracks (for multi-track preview)
 * Returns clips sorted by track number (0 = base, higher tracks = overlays)
 *
 * @param {Array} clips - Array of clip objects from timeline
 * @param {number} currentTime - Current playhead time in seconds
 * @returns {Array} Array of clip objects at the current time, sorted by track
 */
export function getAllClipsAtTime(clips, currentTime) {
  const visibleClips = clips.filter(clip => {
    const clipEndTime = clip.startTime + clip.duration;
    return currentTime >= clip.startTime && currentTime < clipEndTime;
  });

  // Sort by track (lower tracks first)
  return visibleClips.sort((a, b) => a.track - b.track);
}

/**
 * Format time in seconds to MM:SS format
 *
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string (MM:SS or HH:MM:SS)
 */
export function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Convert asset:// protocol path to usable file path for video element
 * Tauri uses asset:// protocol to serve local files
 *
 * @param {string} path - File path (may include asset:// protocol)
 * @returns {string} Path usable by HTML5 video element
 */
import { convertFileSrc } from '@tauri-apps/api/tauri';

export function convertToAssetPath(path) {
  if (!path) return '';

  // Use Tauri's convertFileSrc for proper asset URL generation
  return convertFileSrc(path);
}
