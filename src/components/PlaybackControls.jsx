import { useEffect } from 'react';
import { useTimeline } from '../store/timelineStore.jsx';

/**
 * Playback Controls Component
 *
 * Provides play/pause/stop buttons for timeline playback.
 * Supports spacebar keyboard shortcut for play/pause toggle.
 */
function PlaybackControls() {
  const { isPlaying, clips, togglePlayback, setPlaybackState, setPlayheadTime } = useTimeline();

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

      {/* Status text */}
      <div className="ml-2 text-sm text-gray-400">
        {!hasClips && 'Add clips to timeline to enable playback'}
        {hasClips && isPlaying && 'Playing...'}
        {hasClips && !isPlaying && 'Press Space or click Play to start'}
      </div>
    </div>
  );
}

export default PlaybackControls;
