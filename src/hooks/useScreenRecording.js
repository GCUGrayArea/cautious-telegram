import { useState, useCallback, useRef } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/tauri';
import { ScreenRecorder } from '../utils/screenRecorder';

/**
 * useScreenRecording - Preact hook for managing screen recording state
 *
 * Features:
 * - Start/stop screen recording
 * - Track recording duration
 * - Auto-save and import recordings to media library
 * - Error handling
 *
 * @returns {Object} Recording state and control functions
 */
export function useScreenRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const recorderRef = useRef(null);

  /**
   * Start screen recording
   * @param {Object} options - Recording options
   * @param {boolean} options.audio - Whether to capture microphone audio
   */
  const startRecording = useCallback(async ({ audio = true } = {}) => {
    try {
      setError(null);
      setDuration(0);

      // Create new recorder instance
      recorderRef.current = new ScreenRecorder();

      // Start recording with duration updates
      await recorderRef.current.start({
        audio,
        onDurationUpdate: (newDuration) => {
          setDuration(newDuration);
        }
      });

      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err.message);
      recorderRef.current = null;
    }
  }, []);

  /**
   * Stop screen recording and save to media library
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
      const blobData = await ScreenRecorder.blobToUint8Array(blob);

      // Generate filename
      const filename = ScreenRecorder.generateFilename();

      // Save recording via Tauri command
      const savedPath = await invoke('save_recording', {
        blobData: Array.from(blobData), // Convert Uint8Array to regular array for Tauri
        filename
      });

      console.log('Recording saved to:', savedPath);

      // Import recording to media library
      const mediaItem = await invoke('import_recording', {
        filePath: savedPath
      });

      console.log('Recording imported to media library:', mediaItem);

      setIsSaving(false);

      // Call completion callback
      if (onComplete) {
        onComplete(mediaItem);
      }

      // Reset duration
      setDuration(0);

    } catch (err) {
      console.error('Failed to stop/save recording:', err);
      setError(err.message || 'Failed to save recording');
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
      setError(err.message);
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
    isRecording,
    duration,
    formattedDuration: formatDuration(duration),
    error,
    isSaving,
    startRecording,
    stopRecording,
    cancelRecording
  };
}
