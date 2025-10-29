import { useState, useEffect } from 'react';
import { useTimeline } from '../store/timelineStore.jsx';

/**
 * TransitionEditor Component
 *
 * Popup panel for adding/editing transition effects between clips.
 * Allows selecting transition type and adjusting duration.
 */
function TransitionEditor({ transition, onClose, clipBefore, clipAfter }) {
  const { addTransition, updateTransition, removeTransition } = useTimeline();

  const [type, setType] = useState(transition?.type || 'fade');
  const [duration, setDuration] = useState(transition?.duration || 1.0);

  useEffect(() => {
    if (transition) {
      setType(transition.type);
      setDuration(transition.duration);
    }
  }, [transition]);

  const transitionTypes = [
    { value: 'fade', label: 'Fade', description: 'Smooth fade between clips' },
    { value: 'crossfade', label: 'Crossfade', description: 'Blend clips together' },
    { value: 'fadeToBlack', label: 'Fade to Black', description: 'Fade to black then fade in' },
    { value: 'wipeLeft', label: 'Wipe Left', description: 'New clip slides in from left' },
    { value: 'wipeRight', label: 'Wipe Right', description: 'New clip slides in from right' },
    { value: 'dissolve', label: 'Dissolve', description: 'Pixel-by-pixel blend' },
  ];

  const handleSave = () => {
    if (transition) {
      // Update existing transition
      updateTransition(transition.id, { type, duration });
    } else {
      // Add new transition
      addTransition({
        clipIdBefore: clipBefore.id,
        clipIdAfter: clipAfter.id,
        type,
        duration,
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (transition) {
      removeTransition(transition.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4">
          {transition ? 'Edit Transition' : 'Add Transition'}
        </h2>

        {/* Transition Type Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Transition Type
          </label>
          <div className="space-y-2">
            {transitionTypes.map((t) => (
              <label
                key={t.value}
                className="flex items-center p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition"
              >
                <input
                  type="radio"
                  name="transitionType"
                  value={t.value}
                  checked={type === t.value}
                  onChange={(e) => setType(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-white">{t.label}</div>
                  <div className="text-xs text-gray-400">{t.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Duration Slider */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Duration: {duration.toFixed(1)}s
          </label>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={duration}
            onChange={(e) => setDuration(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0.5s</span>
            <span>3.0s</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-between gap-2">
          <div>
            {transition && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              {transition ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TransitionEditor;
