import { useEffect, useState } from 'react';
import { useTimeline } from '../store/timelineStore.jsx';
import { invoke } from '@tauri-apps/api/tauri';

/**
 * Playback Controls Component
 *
 * Provides play/pause/stop buttons for timeline playback.
 * Supports spacebar keyboard shortcut for play/pause toggle.
 */
function PlaybackControls({ onExportClick, currentTime }) {
  const { isPlaying, clips, togglePlayback, setPlaybackState, setPlayheadTime, addTextOverlay, playheadTime } = useTimeline();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState(null);

  // Spacebar shortcut for play/pause
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only trigger if not typing in an input field
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        togglePlayback();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [togglePlayback]);

  const handleStop = () => {
    setPlaybackState(false);
    setPlayheadTime(0);
  };

  const handleAddTextOverlay = () => {
    // Create a new text overlay at the current playhead position
    addTextOverlay({
      text: 'New Text',
      startTime: playheadTime || 0,
      duration: 5, // 5 second default duration
      x: 50,
      y: 50,
      fontSize: 48,
      fontFamily: 'Arial',
      color: '#FFFFFF',
      animation: 'none',
    });
  };

  const handleTranscribeTimeline = async () => {
    if (!clips || clips.length === 0) {
      setTranscriptionError('No clips in timeline');
      return;
    }

    setIsTranscribing(true);
    setTranscriptionError(null);

    try {
      // Call backend transcription command
      const result = await invoke('transcribe_timeline', {
        clips: clips.map(clip => ({
          id: clip.id,
          path: clip.metadata?.path,
          start_time: clip.startTime,
          in_point: clip.inPoint,
          out_point: clip.outPoint,
          track: clip.track || 0,
        })),
      });

      // Add text overlays from transcription result
      if (result && result.segments && result.segments.length > 0) {
        console.log('Transcription result segments:', result.segments);
        result.segments.forEach(segment => {
          console.log(`Adding overlay: text="${segment.text}", startTime=${segment.startTime}, duration=${segment.duration}`);
          addTextOverlay({
            text: segment.text,
            startTime: segment.startTime,
            duration: segment.duration,
            x: 50,
            y: 90, // 10% from bottom (100 - 90 = 10)
            fontSize: 64,
            fontFamily: 'Arial',
            color: '#FFFFFF',
            animation: 'none',
          });
        });
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setTranscriptionError(error.message || 'Transcription failed');
    } finally {
      setIsTranscribing(false);
    }
  };

  const hasClips = clips && clips.length > 0;

  return (
    <div className="playback-controls flex items-center gap-3 px-4 py-3 bg-gray-800 border-t border-gray-700">
      {/* Play/Pause button */}
      <button
        onClick={togglePlayback}
        disabled={!hasClips}
        className={`p-2 rounded transition ${
          hasClips
            ? 'hover:bg-gray-700 text-white'
            : 'text-gray-600 cursor-not-allowed'
        }`}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
      >
        {isPlaying ? (
          // Pause icon
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          // Play icon
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {/* Stop button */}
      <button
        onClick={handleStop}
        disabled={!hasClips}
        className={`p-2 rounded transition ${
          hasClips
            ? 'hover:bg-gray-700 text-white'
            : 'text-gray-600 cursor-not-allowed'
        }`}
        title="Stop"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Add Text Overlay button */}
      <button
        onClick={handleAddTextOverlay}
        className="p-2 rounded transition hover:bg-gray-700 text-white"
        title="Add text overlay at current playhead position (T)"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM15.657 14.243a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM11 17a1 1 0 102 0v-1a1 1 0 10-2 0v1zM5.757 15.657a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707zM4 11a1 1 0 110-2H3a1 1 0 110 2h1zM5.757 5.757a1 1 0 00-1.414 1.414l.707.707a1 1 0 101.414-1.414l-.707-.707zM12 7a1 1 0 110-2h.01a1 1 0 110 2H12z"
          />
        </svg>
      </button>

      {/* Transcribe button */}
      <button
        onClick={handleTranscribeTimeline}
        disabled={!hasClips || isTranscribing}
        className={`p-2 rounded transition ${
          hasClips && !isTranscribing
            ? 'hover:bg-gray-700 text-white'
            : 'text-gray-600 cursor-not-allowed'
        }`}
        title="Transcribe timeline with AI"
      >
        {isTranscribing ? (
          // Loading icon (spinning)
          <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          // Microphone icon
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 16.5a1 1 0 11-2 0 1 1 0 012 0zM15 7H4a1 1 0 000 2v5a6 6 0 0012 0V9a1 1 0 100-2zm-5 9a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </button>

      {/* Status text */}
      <div className="ml-2 text-sm">
        {transcriptionError && (
          <span className="text-red-400">Error: {transcriptionError}</span>
        )}
        {!transcriptionError && (
          <span className="text-gray-400">
            {!hasClips && 'Add clips to timeline to enable playback'}
            {hasClips && isPlaying && 'Playing...'}
            {hasClips && !isPlaying && 'Press Space or click Play to start'}
            {hasClips && isTranscribing && 'Transcribing...'}
          </span>
        )}
      </div>

      {/* Current time display and Export button */}
      <div className="ml-4 flex items-center gap-2">
        <div className="bg-gray-700 rounded px-3 py-1">
          <span className="text-xs text-gray-300">
            Time: {currentTime?.toFixed(2) || '0.00'}s
          </span>
        </div>
        <button
          onClick={onExportClick}
          disabled={!hasClips}
          className={`text-xs px-3 py-1 rounded transition ${
            hasClips
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
          title="Export timeline to video file"
        >
          Export
        </button>
      </div>

      {/* Timeline control hints */}
      <div className="ml-auto text-xs text-gray-500">
        <p>Ctrl+Scroll: Zoom | Scroll: Pan | Click: Jump playhead | Drag red handle: Scrub</p>
      </div>
    </div>
  );
}

export default PlaybackControls;
