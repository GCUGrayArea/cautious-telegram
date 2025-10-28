/**
 * ScreenRecorder - Utility class for screen recording using getDisplayMedia and MediaRecorder
 *
 * Features:
 * - Screen capture with optional microphone audio
 * - Records to WebM format
 * - Generates timestamped filenames
 * - Provides recording duration tracking
 */

export class ScreenRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.stream = null;
    this.startTime = null;
    this.durationInterval = null;
  }

  /**
   * Start screen recording
   * @param {Object} options - Recording options
   * @param {boolean} options.audio - Whether to capture microphone audio (default: true)
   * @param {Function} options.onDurationUpdate - Callback for duration updates (called every second)
   * @returns {Promise<void>}
   */
  async start({ audio = true, onDurationUpdate = null } = {}) {
    try {
      // Request screen capture
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false // Screen audio not needed for MVP
      });

      let tracks = displayStream.getTracks();

      // Add microphone audio if requested
      if (audio) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 44100
            }
          });
          tracks = [...tracks, ...audioStream.getAudioTracks()];
        } catch (audioError) {
          console.warn('Microphone access denied, recording without audio:', audioError);
        }
      }

      // Create combined stream
      this.stream = new MediaStream(tracks);

      // Initialize MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
      });

      // Reset recorded chunks
      this.recordedChunks = [];

      // Handle data available event
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      // Start recording
      this.mediaRecorder.start(1000); // Capture data every second
      this.startTime = Date.now();

      // Setup duration tracking
      if (onDurationUpdate) {
        this.durationInterval = setInterval(() => {
          const duration = this.getRecordingDuration();
          onDurationUpdate(duration);
        }, 1000);
      }

      console.log('Screen recording started');
    } catch (error) {
      console.error('Failed to start screen recording:', error);
      throw new Error(`Screen recording failed: ${error.message}`);
    }
  }

  /**
   * Stop screen recording and return the blob
   * @returns {Promise<Blob>}
   */
  async stop() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('No active recording to stop'));
        return;
      }

      // Handle stop event
      this.mediaRecorder.onstop = () => {
        // Create blob from recorded chunks
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });

        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }

        // Clear duration interval
        if (this.durationInterval) {
          clearInterval(this.durationInterval);
          this.durationInterval = null;
        }

        // Reset state
        this.mediaRecorder = null;
        this.stream = null;
        this.recordedChunks = [];
        this.startTime = null;

        console.log('Screen recording stopped, blob size:', blob.size);
        resolve(blob);
      };

      // Stop recording
      this.mediaRecorder.stop();
    });
  }

  /**
   * Get current recording duration in seconds
   * @returns {number}
   */
  getRecordingDuration() {
    if (!this.startTime) {
      return 0;
    }
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Check if currently recording
   * @returns {boolean}
   */
  isRecording() {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }

  /**
   * Generate a timestamped filename for the recording
   * @returns {string}
   */
  static generateFilename() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `recording_${year}${month}${day}_${hours}${minutes}${seconds}.webm`;
  }

  /**
   * Convert a Blob to a Uint8Array for Tauri command
   * @param {Blob} blob
   * @returns {Promise<Uint8Array>}
   */
  static async blobToUint8Array(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }
}
