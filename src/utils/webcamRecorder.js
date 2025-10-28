/**
 * WebcamRecorder - Utility class for webcam recording using getUserMedia and MediaRecorder
 *
 * Features:
 * - Webcam capture with synchronized audio
 * - Device selection (enumerate available cameras)
 * - Preview mode (non-recording)
 * - Records to WebM format
 * - Generates timestamped filenames
 * - Provides recording duration tracking
 */

export class WebcamRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.stream = null;
    this.previewStream = null;
    this.startTime = null;
    this.durationInterval = null;
  }

  /**
   * Get available camera devices
   * @returns {Promise<Array>} Array of video input devices
   */
  static async getDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      throw new Error(`Device enumeration failed: ${error.message}`);
    }
  }

  /**
   * Start preview mode (non-recording)
   * @param {string|null} deviceId - Camera device ID (null for default camera)
   * @returns {Promise<MediaStream>} Preview stream to attach to video element
   */
  async startPreview(deviceId = null) {
    try {
      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false // Preview is video-only
      };

      this.previewStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Webcam preview started');
      return this.previewStream;
    } catch (error) {
      console.error('Failed to start preview:', error);
      throw new Error(`Preview failed: ${error.message}`);
    }
  }

  /**
   * Stop preview mode
   */
  stopPreview() {
    if (this.previewStream) {
      this.previewStream.getTracks().forEach(track => track.stop());
      this.previewStream = null;
      console.log('Webcam preview stopped');
    }
  }

  /**
   * Start webcam recording
   * @param {Object} options - Recording options
   * @param {string|null} options.deviceId - Camera device ID (null for default)
   * @param {boolean} options.audio - Whether to capture microphone audio (default: true)
   * @param {Function} options.onDurationUpdate - Callback for duration updates (called every second)
   * @returns {Promise<void>}
   */
  async start({ deviceId = null, audio = true, onDurationUpdate = null } = {}) {
    try {
      // Request webcam capture with optional device selection
      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: audio
          ? { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 }
          : false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

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

      console.log('Webcam recording started');
    } catch (error) {
      console.error('Failed to start webcam recording:', error);
      throw new Error(`Webcam recording failed: ${error.message}`);
    }
  }

  /**
   * Stop webcam recording and return the blob
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

        console.log('Webcam recording stopped, blob size:', blob.size);
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

    return `webcam_${year}${month}${day}_${hours}${minutes}${seconds}.webm`;
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
