import { useState, useRef, useEffect } from 'react';
import { saveRecording, importRecording, formatDuration } from '../utils/api';

/**
 * RecordingPanel Component
 *
 * Provides UI for screen recording with source selection,
 * recording controls, timer, and automatic media library import.
 */
function RecordingPanel({ onRecordingImported }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const streamRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  /**
   * Start screen recording
   */
  const startRecording = async () => {
    try {
      setError(null);

      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor', // or 'window', 'application'
        },
        audio: false, // Can be changed to true for system audio
      });

      streamRef.current = stream;

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
        ? 'video/webm; codecs=vp9'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        await handleRecordingStop();
      };

      // Handle stream end (user clicks browser's stop sharing button)
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (isRecording) {
          stopRecording();
        }
      });

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      console.log('Screen recording started');
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording: ' + err.message);
    }
  };

  /**
   * Stop screen recording
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setIsRecording(false);
    setIsPaused(false);
  };

  /**
   * Handle recording stop - save and import
   */
  const handleRecordingStop = async () => {
    setIsProcessing(true);

    try {
      // Create blob from recorded chunks
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
      const filename = `recording_${timestamp}.webm`;

      console.log('Saving recording:', filename, 'Size:', blob.size);

      // Save recording to disk
      const filePath = await saveRecording(blob, filename);
      console.log('Recording saved to:', filePath);

      // Import recording into media library
      const importResult = await importRecording(filePath);

      if (importResult.success) {
        console.log('Recording imported successfully:', importResult.media);

        // Notify parent component
        if (onRecordingImported) {
          onRecordingImported(importResult.media);
        }
      } else {
        throw new Error(importResult.error || 'Failed to import recording');
      }

      // Reset state
      setRecordingTime(0);
      recordedChunksRef.current = [];
    } catch (err) {
      console.error('Failed to save/import recording:', err);
      setError('Failed to save recording: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full bg-gray-800 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Screen Recording</h2>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
        {/* Recording Status Indicator */}
        {isRecording && (
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-lg font-medium">Recording...</span>
          </div>
        )}

        {/* Timer Display */}
        <div className="text-center">
          <div className={`text-4xl font-mono ${isRecording ? 'text-red-400' : 'text-gray-400'}`}>
            {formatDuration(recordingTime)}
          </div>
          {!isRecording && !isProcessing && (
            <p className="text-sm text-gray-500 mt-2">
              Click Start to begin recording your screen
            </p>
          )}
        </div>

        {/* Recording Controls */}
        <div className="flex space-x-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isProcessing}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" />
              </svg>
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              disabled={isProcessing}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <rect x="6" y="6" width="8" height="8" />
              </svg>
              <span>Stop Recording</span>
            </button>
          )}
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center space-x-2 text-blue-400">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Saving and importing recording...</span>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="w-full max-w-md p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Info Text */}
        {!isRecording && !isProcessing && (
          <div className="w-full max-w-md space-y-2 text-sm text-gray-400">
            <p className="flex items-start space-x-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Your recording will be automatically imported to the media library when you stop.</span>
            </p>
            <p className="flex items-start space-x-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>You can select which screen or window to record after clicking Start.</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecordingPanel;
