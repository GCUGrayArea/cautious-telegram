import { useState } from 'react';
import { useTimeline } from '../store/timelineStore.jsx';

/**
 * Clip Properties Panel Component
 *
 * Displays and allows editing of audio properties for selected clips:
 * - Volume (0-200%)
 * - Mute toggle
 * - Fade in duration (0-5s)
 * - Fade out duration (0-5s)
 */
function ClipPropertiesPanel() {
  const { clips, selectedClipId, updateClip } = useTimeline();
  const [expandedSection, setExpandedSection] = useState('audio'); // 'audio' or null

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

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="clip-properties-panel bg-gray-800 border-t border-gray-700 p-4 text-white">
      <h3 className="text-sm font-bold mb-3">
        Clip Properties: {selectedClip.metadata?.filename || `Clip ${selectedClipId}`}
      </h3>

      {/* Audio Section */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection('audio')}
          className="w-full text-left text-xs font-semibold text-gray-300 hover:text-white mb-2 flex items-center gap-2 transition"
        >
          <span className={`transform transition ${expandedSection === 'audio' ? 'rotate-90' : ''}`}>
            ▶
          </span>
          🔊 Audio Controls
        </button>

        {expandedSection === 'audio' && (
          <div className="bg-gray-900 rounded p-3 space-y-3">
            {/* Volume Control */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Volume: {selectedClip.volume ?? 100}%
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={selectedClip.volume ?? 100}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(selectedClip.volume ?? 100) / 2}%, #374151 ${(selectedClip.volume ?? 100) / 2}%, #374151 100%)`,
                }}
              />
              <div className="text-xs text-gray-500 mt-1 flex justify-between">
                <span>0%</span>
                <span>100%</span>
                <span>200%</span>
              </div>
            </div>

            {/* Mute Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleMuteToggle}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  selectedClip.isMuted
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                }`}
              >
                {selectedClip.isMuted ? '🔇 Muted' : '🔊 Unmuted'}
              </button>
              <span className="text-xs text-gray-400">
                {selectedClip.isMuted ? 'Audio is muted' : 'Audio is playing'}
              </span>
            </div>

            {/* Fade In Duration */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Fade In: {(selectedClip.fadeInDuration ?? 0).toFixed(1)}s
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={selectedClip.fadeInDuration ?? 0}
                onChange={(e) => handleFadeInChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded appearance-none cursor-pointer"
              />
              <div className="text-xs text-gray-500 mt-1 flex justify-between">
                <span>Off</span>
                <span>5s</span>
              </div>
            </div>

            {/* Fade Out Duration */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Fade Out: {(selectedClip.fadeOutDuration ?? 0).toFixed(1)}s
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={selectedClip.fadeOutDuration ?? 0}
                onChange={(e) => handleFadeOutChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded appearance-none cursor-pointer"
              />
              <div className="text-xs text-gray-500 mt-1 flex justify-between">
                <span>Off</span>
                <span>5s</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="pt-2 border-t border-gray-700">
              <p className="text-xs text-gray-400 mb-2">Quick presets:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    handleVolumeChange(100);
                    handleMuteToggle();
                  }}
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition"
                >
                  Unmute All
                </button>
                <button
                  onClick={() => {
                    handleFadeInChange(0.5);
                    handleFadeOutChange(0.5);
                  }}
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition"
                >
                  Quick Fade
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-xs text-gray-500 border-t border-gray-700 pt-2">
        <p>Select a clip to adjust its audio properties. Changes will be reflected in preview and export.</p>
      </div>
    </div>
  );
}

export default ClipPropertiesPanel;
