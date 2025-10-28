import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { WebcamRecorder } from '../utils/webcamRecorder';

/**
 * useWebcamRecording - React hook for managing webcam recording state
 *
 * Features:
 * - Enumerate and select webcam devices
 * - Preview webcam feed before recording
 * - Start/stop webcam recording
 * - Track recording duration
 * - Auto-save and import recordings to media library
 * - Error handling
 *
 * @returns {Object} Webcam recording state and control functions
 */
export function useWebcamRecording() {
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const recorderRef = useRef(null);

  /**
   * Load available camera devices on mount
   */
  useEffect(() => {
    WebcamRecorder.getDevices()
      .then(devices => {
        setAvailableDevices(devices);
        // Auto-select first device if available
        if (devices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(devices[0].deviceId);
        }
      })
      .catch(err => {
        console.error('Failed to load camera devices:', err);
        setError(err.message || 'Failed to access camera devices');
      });
  }, []);

  /**
   * Start preview mode (non-recording)
   * @param {HTMLVideoElement} videoElement - Video element to attach preview stream
   */
  const startPreview = useCallback(async (videoElement) => {
    try {
      setError(null);

      // Create new recorder instance if needed
      if (!recorderRef.current) {
        recorderRef.current = new WebcamRecorder();
      }

      // Start preview with selected device
      const stream = await recorderRef.current.startPreview(selectedDeviceId);

      // Attach stream to video element
      if (videoElement) {
        videoElement.srcObject = stream;
      }

      setIsPreviewing(true);
    } catch (err) {
      console.error('Failed to start preview:', err);
      setError(err.message || 'Failed to start webcam preview');
      recorderRef.current = null;
    }
  }, [selectedDeviceId]);

  /**
   * Stop preview mode
   */
  const stopPreview = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stopPreview();
      setIsPreviewing(false);
    }
  }, []);

  /**
   * Start webcam recording
   * @param {Object} options - Recording options
   * @param {boolean} options.audio - Whether to capture microphone audio (default: true)
   */
  const startRecording = useCallback(async ({ audio = true } = {}) => {
    try {
      setError(null);
      setDuration(0);

      // Create new recorder instance
      recorderRef.current = new WebcamRecorder();

      // Start recording with duration updates
      await recorderRef.current.start({
        deviceId: selectedDeviceId,
        audio,
        onDurationUpdate: (newDuration) => {
          setDuration(newDuration);
        }
      });

      setIsRecording(true);
      setIsPreviewing(false); // Stop preview mode when recording starts
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err.message || 'Failed to start webcam recording');
      recorderRef.current = null;
    }
  }, [selectedDeviceId]);

  /**
   * Stop webcam recording and save to media library
   * @param {Function} onComplete - Callback when recording is saved and imported
   */
  const stopRecording = useCallback(async (onComplete = null) => {
    if (!recorderRef.current) {
      setError('No active recording to stop');
      return;
    }

    try {
      setIsSaving(true);

      // Stop recording and get blob
      const blob = await recorderRef.current.stop();
      setIsRecording(false);

      // Convert blob to Uint8Array for Tauri
      const blobData = await WebcamRecorder.blobToUint8Array(blob);

      // Generate filename
      const filename = WebcamRecorder.generateFilename();

      // Save recording via Tauri command
      const savedPath = await invoke('save_recording', {
        blobData: Array.from(blobData), // Convert Uint8Array to regular array for Tauri
        filename
      });

      console.log('Webcam recording saved to:', savedPath);

      // Import recording to media library
      const mediaItem = await invoke('import_recording', {
        filePath: savedPath
      });

      console.log('Webcam recording imported to media library:', mediaItem);

      setIsSaving(false);

      // Call completion callback
      if (onComplete) {
        onComplete(mediaItem);
      }

      // Reset duration
      setDuration(0);

    } catch (err) {
      console.error('Failed to stop/save recording:', err);
      setError(err.message || 'Failed to save webcam recording');
      setIsRecording(false);
      setIsSaving(false);
    } finally {
      recorderRef.current = null;
    }
  }, []);

  /**
   * Cancel recording without saving
   */
  const cancelRecording = useCallback(async () => {
    if (!recorderRef.current) {
      return;
    }

    try {
      // Stop recording but don't save
      await recorderRef.current.stop();
      setIsRecording(false);
      setDuration(0);
      recorderRef.current = null;
    } catch (err) {
      console.error('Failed to cancel recording:', err);
      setError(err.message || 'Failed to cancel recording');
    }
  }, []);

  /**
   * Format duration in MM:SS format
   * @param {number} seconds
   * @returns {string}
   */
  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  return {
    // Device management
    availableDevices,
    selectedDeviceId,
    setSelectedDeviceId,

    // State
    isPreviewing,
    isRecording,
    duration,
    formattedDuration: formatDuration(duration),
    error,
    isSaving,

    // Controls
    startPreview,
    stopPreview,
    startRecording,
    stopRecording,
    cancelRecording
  };
}
