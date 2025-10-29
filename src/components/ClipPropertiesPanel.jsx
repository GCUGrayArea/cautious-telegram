import { useTimeline } from '../store/timelineStore.jsx';

/**
 * Clip Properties Panel Component
 *
 * Right-side panel for editing audio properties of selected clips:
 * - Volume (0-200%)
 * - Mute toggle
 * - Fade in duration (0-5s)
 * - Fade out duration (0-5s)
 */
function ClipPropertiesPanel() {
  const { clips, selectedClipId, updateClip, clearSelection } = useTimeline();

  // Find selected clip
  const selectedClip = clips.find(clip => clip.id === selectedClipId);

  // Don't show panel if no clip is selected
  if (!selectedClipId || !selectedClip) {
    return null;
  }

  const handleVolumeChange = (newVolume) => {
    updateClip(selectedClipId, { volume: newVolume });
  };

  const handleMuteToggle = () => {
    updateClip(selectedClipId, { isMuted: !selectedClip.isMuted });
  };

  const handleFadeInChange = (duration) => {
    updateClip(selectedClipId, { fadeInDuration: duration });
  };

  const handleFadeOutChange = (duration) => {
    updateClip(selectedClipId, { fadeOutDuration: duration });
  };

  return (
    <div className="fixed right-0 top-16 bottom-0 w-80 bg-gray-900 border-l border-gray-700 p-4 overflow-y-auto shadow-lg z-50">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Audio Controls</h2>
        <button
          onClick={clearSelection}
          className="text-gray-400 hover:text-gray-200 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Clip Name */}
      <div className="mb-6">
        <p className="text-sm text-gray-400">
          {selectedClip.metadata?.filename || `Clip ${selectedClipId}`}
        </p>
      </div>

      {/* Volume Control */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Volume: {selectedClip.volume ?? 100}%
        </label>
        <input
          type="range"
          min="0"
          max="200"
          value={selectedClip.volume ?? 100}
          onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="text-xs text-gray-500 mt-1 flex justify-between">
          <span>0%</span>
          <span>100%</span>
          <span>200%</span>
        </div>
      </div>

      {/* Mute Toggle */}
      <div className="mb-6">
        <button
          onClick={handleMuteToggle}
          className={`w-full px-4 py-2 rounded font-semibold transition ${
            selectedClip.isMuted
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          }`}
        >
          {selectedClip.isMuted ? '🔇 Muted' : '🔊 Unmuted'}
        </button>
        <p className="text-xs text-gray-400 mt-2">
          {selectedClip.isMuted ? 'Audio is muted' : 'Audio is playing'}
        </p>
      </div>

      {/* Fade In Duration */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Fade In: {(selectedClip.fadeInDuration ?? 0).toFixed(1)}s
        </label>
        <input
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={selectedClip.fadeInDuration ?? 0}
          onChange={(e) => handleFadeInChange(parseFloat(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="text-xs text-gray-500 mt-1 flex justify-between">
          <span>Off</span>
          <span>5s</span>
        </div>
      </div>

      {/* Fade Out Duration */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Fade Out: {(selectedClip.fadeOutDuration ?? 0).toFixed(1)}s
        </label>
        <input
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={selectedClip.fadeOutDuration ?? 0}
          onChange={(e) => handleFadeOutChange(parseFloat(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="text-xs text-gray-500 mt-1 flex justify-between">
          <span>Off</span>
          <span>5s</span>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="mb-6 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-400 mb-3">Quick Presets:</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              handleVolumeChange(100);
              if (selectedClip.isMuted) handleMuteToggle();
            }}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-2 rounded transition"
          >
            Unmute
          </button>
          <button
            onClick={() => {
              handleFadeInChange(0.5);
              handleFadeOutChange(0.5);
            }}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-2 rounded transition"
          >
            Quick Fade
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-gray-500 border-t border-gray-700 pt-4">
        <p>Changes are applied to preview and export.</p>
      </div>
    </div>
  );
}

export default ClipPropertiesPanel;
