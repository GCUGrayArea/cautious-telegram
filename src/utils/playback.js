/**
 * Playback Engine
 *
 * Manages real-time playback using requestAnimationFrame for smooth 60fps animation.
 * Handles playhead progression, timeline boundaries, and synchronization callbacks.
 */

export class PlaybackEngine {
  /**
   * Create a playback engine
   * @param {Object} callbacks - Callback functions
   * @param {Function} callbacks.onTimeUpdate - Called every frame with current playhead time
   * @param {Function} callbacks.onPlaybackEnd - Called when playback reaches timeline end
   */
  constructor({ onTimeUpdate, onPlaybackEnd }) {
    this.isPlaying = false;
    this.startTime = null; // Performance.now() when playback started
    this.lastFrameTime = null; // Performance.now() of last frame
    this.playheadTime = 0; // Current playhead position in seconds
    this.onTimeUpdate = onTimeUpdate;
    this.onPlaybackEnd = onPlaybackEnd;
    this.animationFrameId = null;
    this.totalDuration = 0; // End of timeline in seconds
  }

  /**
   * Start playback from current position
   * @param {number} currentTime - Starting playhead time in seconds
   * @param {number} totalDuration - Total timeline duration in seconds
   */
  start(currentTime, totalDuration) {
    if (this.isPlaying) return; // Already playing

    this.isPlaying = true;
    this.playheadTime = currentTime;
    this.totalDuration = totalDuration;
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;

    // Start animation loop
    this.animate();
  }

  /**
   * Pause playback
   */
  pause() {
    this.isPlaying = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Stop playback and reset to start
   */
  stop() {
    this.pause();
    this.playheadTime = 0;
    this.onTimeUpdate(0);
  }

  /**
   * Seek to a specific time (updates internal playhead without affecting playback state)
   * @param {number} time - Time in seconds to seek to
   */
  seek(time) {
    this.playheadTime = time;
    this.lastFrameTime = performance.now();
  }

  /**
   * Main animation loop using requestAnimationFrame
   * Runs at ~60fps for smooth playhead progression
   */
  animate() {
    if (!this.isPlaying) return;

    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) / 1000; // Convert ms to seconds
    this.lastFrameTime = now;

    // Update playhead position based on time elapsed
    this.playheadTime += deltaTime;

    // Check if reached end of timeline
    if (this.playheadTime >= this.totalDuration) {
      this.playheadTime = this.totalDuration;
      this.onTimeUpdate(this.playheadTime);
      this.onPlaybackEnd(); // Notify that playback ended
      this.pause();
      return;
    }

    // Update playhead in timeline store
    this.onTimeUpdate(this.playheadTime);

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  /**
   * Clean up resources (call when component unmounts)
   */
  destroy() {
    this.pause();
    this.onTimeUpdate = null;
    this.onPlaybackEnd = null;
  }
}

/**
 * Calculate total timeline duration from clips
 * @param {Array} clips - Array of clip objects
 * @returns {number} Total duration in seconds
 */
export function calculateTimelineDuration(clips) {
  if (!clips || clips.length === 0) return 0;

  // Find the clip that ends latest
  const maxEndTime = Math.max(
    ...clips.map(clip => clip.startTime + clip.duration)
  );

  return maxEndTime;
}
