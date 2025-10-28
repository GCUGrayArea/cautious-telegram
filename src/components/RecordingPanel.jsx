import { useState, useRef, useEffect } from 'react';
import { saveRecording, importRecording, formatDuration } from '../utils/api';
import { WebcamRecorder } from '../utils/webcamRecorder';
import { useTimeline } from '../store/timelineStore.jsx';

/**
 * RecordingPanel Component
 *
 * Provides UI for screen, webcam, and simultaneous recording with source selection,
 * recording controls, timer, and automatic media library import.
 *
 * NOW A PRESENTATIONAL COMPONENT: Recording state is managed by parent App component
 * to persist across tab switches.
 */
function RecordingPanel({
  onRecordingImported,
  isRecording,
  setIsRecording,
  recordingTime,
  setRecordingTime,
  recordingMode,
  setRecordingMode,
  screenMediaRecorderRef,
  screenChunksRef,
  screenStreamRef,
  webcamRecorderRef,
  webcamChunksRef,
  timerIntervalRef,
  startTimeRef,
}) {
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { addClip } = useTimeline();
  const previewRef = useRef(null);

  // Setup preview stream when recording starts
  useEffect(() => {
    if (!isRecording || !previewRef.current) return;

    const setupPreview = async () => {
      try {
        if (recordingMode === 'screen' || recordingMode === 'both') {
          // For screen recording, use the screen stream
          if (screenStreamRef.current) {
            previewRef.current.srcObject = screenStreamRef.current;
            previewRef.current.play();
          }
        } else if (recordingMode === 'webcam') {
          // For webcam, get the stream from the webcam recorder
          if (webcamRecorderRef.current && webcamRecorderRef.current.stream) {
            previewRef.current.srcObject = webcamRecorderRef.current.stream;
            previewRef.current.play();
          }
        }
      } catch (err) {
        console.error('Failed to setup preview:', err);
      }
    };

    setupPreview();

    // Cleanup preview when recording stops
    return () => {
      if (previewRef.current) {
        previewRef.current.srcObject = null;
      }
    };
  }, [isRecording, recordingMode, screenStreamRef, webcamRecorderRef]);

  // Drag handlers for preview window
  const handlePreviewMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - previewPosition.x,
      y: e.clientY - previewPosition.y
    });
    e.preventDefault();
  };

  const handlePreviewMouseMove = (e) => {
    if (!isDragging) return;
    setPreviewPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePreviewMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handlePreviewMouseMove);
      document.addEventListener('mouseup', handlePreviewMouseUp);
      return () => {
        document.removeEventListener('mousemove', handlePreviewMouseMove);
        document.removeEventListener('mouseup', handlePreviewMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  /**
   * Start recording based on selected mode
   */
  const startRecording = async () => {
    try {
      setError(null);
      startTimeRef.current = Date.now();

      if (recordingMode === 'screen') {
        await startScreenRecording();
      } else if (recordingMode === 'webcam') {
        await startWebcamRecording();
      } else if (recordingMode === 'both') {
        await startBothRecordings();
      }

      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      console.log(`Recording started in ${recordingMode} mode`);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording: ' + err.message);
    }
  };

  /**
   * Start screen capture recording
   */
  const startScreenRecording = async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always',
        displaySurface: 'monitor',
      },
      audio: false,
    });

    screenStreamRef.current = stream;

    const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
      ? 'video/webm; codecs=vp9'
      : 'video/webm';

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 2500000,
    });

    screenMediaRecorderRef.current = mediaRecorder;
    screenChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        screenChunksRef.current.push(event.data);
      }
    };

    // Handle stream end
    stream.getVideoTracks()[0].addEventListener('ended', () => {
      if (isRecording) {
        stopRecording();
      }
    });

    mediaRecorder.start(100);
  };

  /**
   * Start webcam recording
   */
  const startWebcamRecording = async () => {
    webcamRecorderRef.current = new WebcamRecorder();
    webcamChunksRef.current = [];

    // Create promise to collect chunks
    const recorder = webcamRecorderRef.current;

    await recorder.start({
      deviceId: null, // Use default camera
      audio: true,
    });
  };

  /**
   * Start both screen and webcam recordings simultaneously
   */
  const startBothRecordings = async () => {
    // Start both in parallel
    await Promise.all([
      startScreenRecording(),
      startWebcamRecording()
    ]);
  };

  /**
   * Stop recording
   */
  const stopRecording = async () => {
    // Stop timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setIsRecording(false);

    // Process recordings
    await handleRecordingStop();
  };

  /**
   * Handle recording stop - save and import
   */
  const handleRecordingStop = async () => {
    setIsProcessing(true);

    try {
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
      const recordings = [];

      // Process screen recording
      if (screenMediaRecorderRef.current && screenChunksRef.current.length > 0) {
        // Stop screen recorder
        if (screenMediaRecorderRef.current.state !== 'inactive') {
          await new Promise((resolve) => {
            screenMediaRecorderRef.current.onstop = resolve;
            screenMediaRecorderRef.current.stop();
          });
        }

        const screenBlob = new Blob(screenChunksRef.current, { type: 'video/webm' });
        const screenFilename = `screen_${timestamp}.webm`;

        console.log('Saving screen recording:', screenFilename, 'Size:', screenBlob.size);
        const screenPath = await saveRecording(screenBlob, screenFilename);
        // Pass recordingTime as duration override (fixes zero-length clips issue)
        const screenImport = await importRecording(screenPath, recordingTime);

        if (screenImport.success) {
          recordings.push({ media: screenImport.media, track: 0, type: 'screen' });
        }
      }

      // Process webcam recording
      if (webcamRecorderRef.current && webcamRecorderRef.current.isRecording()) {
        const webcamBlob = await webcamRecorderRef.current.stop();
        const webcamFilename = `webcam_${timestamp}.webm`;

        console.log('Saving webcam recording:', webcamFilename, 'Size:', webcamBlob.size);
        const webcamPath = await saveRecording(webcamBlob, webcamFilename);
        // Pass recordingTime as duration override (fixes zero-length clips issue)
        const webcamImport = await importRecording(webcamPath, recordingTime);

        if (webcamImport.success) {
          recordings.push({ media: webcamImport.media, track: 1, type: 'webcam' });
        }
      }

      // Add recordings to timeline on separate tracks
      if (recordingMode === 'both' && recordings.length === 2) {
        console.log('Adding both recordings to timeline on separate tracks');

        // Find screen and webcam recordings
        const screenRec = recordings.find(r => r.type === 'screen');
        const webcamRec = recordings.find(r => r.type === 'webcam');

        // Add screen to track 0
        if (screenRec) {
          addClip({
            mediaId: screenRec.media.id,
            startTime: 0,
            duration: screenRec.media.duration,
            track: 0,
            inPoint: 0,
            outPoint: screenRec.media.duration,
            metadata: screenRec.media,
          });
        }

        // Add webcam to track 1
        if (webcamRec) {
          addClip({
            mediaId: webcamRec.media.id,
            startTime: 0,
            duration: webcamRec.media.duration,
            track: 1,
            inPoint: 0,
            outPoint: webcamRec.media.duration,
            metadata: webcamRec.media,
          });
        }
      }

      // Notify parent for media library refresh
      if (onRecordingImported && recordings.length > 0) {
        onRecordingImported(recordings[0].media);
      }

      // Cleanup
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }

      screenMediaRecorderRef.current = null;
      screenChunksRef.current = [];
      webcamRecorderRef.current = null;
      webcamChunksRef.current = [];
      setRecordingTime(0);

      console.log(`Recording(s) imported successfully:`, recordings.length, 'file(s)');
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
        <h2 className="text-lg font-semibold">Recording</h2>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
        {/* Recording Mode Selector */}
        {!isRecording && !isProcessing && (
          <div className="w-full max-w-md">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Recording Mode
            </label>
            <select
              value={recordingMode}
              onChange={(e) => setRecordingMode(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="screen">Screen Only</option>
              <option value="webcam">Webcam Only</option>
              <option value="both">Screen + Webcam</option>
            </select>
          </div>
        )}

        {/* Recording Status Indicator */}
        {isRecording && (
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-lg font-medium">
              Recording {recordingMode === 'both' ? 'Screen + Webcam' : recordingMode === 'screen' ? 'Screen' : 'Webcam'}...
            </span>
          </div>
        )}

        {/* Timer Display */}
        <div className="text-center">
          <div className={`text-4xl font-mono ${isRecording ? 'text-red-400' : 'text-gray-400'}`}>
            {formatDuration(recordingTime)}
          </div>
          {!isRecording && !isProcessing && (
            <p className="text-sm text-gray-500 mt-2">
              {recordingMode === 'both'
                ? 'Record screen and webcam simultaneously'
                : recordingMode === 'webcam'
                ? 'Record from your webcam'
                : 'Record your screen'}
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
            <span>Saving and importing recording(s)...</span>
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
            {recordingMode === 'both' ? (
              <>
                <p className="flex items-start space-x-2">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Both recordings will be saved separately and added to your timeline on different tracks.</span>
                </p>
                <p className="flex items-start space-x-2">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Screen will be on track 0, webcam on track 1 - synchronized automatically.</span>
                </p>
              </>
            ) : (
              <>
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
                  <span>
                    {recordingMode === 'screen'
                      ? 'You can select which screen or window to record after clicking Start.'
                      : 'Your default webcam will be used for recording.'}
                  </span>
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Recording Preview (Picture-in-Picture) */}
      {isRecording && (
        <div
          className="recording-preview"
          style={{
            position: 'fixed',
            left: `${previewPosition.x}px`,
            top: `${previewPosition.y}px`,
            width: '320px',
            height: '180px',
            zIndex: 1000,
            cursor: isDragging ? 'grabbing' : 'grab',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: '#000'
          }}
          onMouseDown={handlePreviewMouseDown}
        >
          <video
            ref={previewRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              pointerEvents: 'none'
            }}
          />
        </div>
      )}
    </div>
  );
}

export default RecordingPanel;
