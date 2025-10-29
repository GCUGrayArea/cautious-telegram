/**
 * Export Dialog Component
 *
 * Modal dialog for exporting timeline to video file.
 * Features:
 * - Preset selection for different platforms (YouTube, TikTok, etc.)
 * - Manual resolution selection (Source, 720p, 1080p)
 * - File save picker
 * - Export progress indication
 * - Success/error messaging
 */
import { useState, useEffect, useRef } from 'react';
import { save } from '@tauri-apps/api/dialog';
import { useTimeline } from '../store/timelineStore';
import { exportTimeline, getExportProgress } from '../utils/api';
import { getPresets, applyPreset } from '../utils/exportPresets';

export default function ExportDialog({ isOpen, onClose }) {
  const { clips, transitions } = useTimeline();

  // Component state
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [resolution, setResolution] = useState('source');
  const [outputPath, setOutputPath] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState({ percentage: 0, current_operation: 'Ready', eta_seconds: null });
  const [showCustomOptions, setShowCustomOptions] = useState(false);

  // Ref for progress polling interval
  const progressIntervalRef = useRef(null);

  // Handle preset selection
  const handlePresetSelect = (presetId) => {
    setSelectedPreset(presetId);
    const presetSettings = applyPreset(presetId);
    if (presetSettings) {
      setResolution(presetSettings.resolution);
    }
    // Don't show custom options when preset is selected
    setShowCustomOptions(false);
  };

  // Handle custom options toggle
  const handleCustomToggle = () => {
    if (!showCustomOptions) {
      // Switch to custom - clear preset selection
      setSelectedPreset(null);
    }
    setShowCustomOptions(!showCustomOptions);
  };

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPreset(null);
      setResolution('source');
      setOutputPath('');
      setError(null);
      setSuccess(false);
      setIsExporting(false);
      setShowCustomOptions(false);
      setProgress({ percentage: 0, current_operation: 'Ready', eta_seconds: null });
    }
  }, [isOpen]);

  // Poll for export progress when exporting
  useEffect(() => {
    if (isExporting) {
      // Poll progress every 500ms
      progressIntervalRef.current = setInterval(async () => {
        try {
          const currentProgress = await getExportProgress();
          setProgress(currentProgress);
        } catch (err) {
          console.error('Failed to get export progress:', err);
        }
      }, 500);
    } else {
      // Clear interval when not exporting
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isExporting]);

  // Auto-close dialog after successful export
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, onClose]);

  // Handle file picker
  const handleChooseLocation = async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const defaultFilename = `ClipForge_Export_${timestamp}.mp4`;

      const selectedPath = await save({
        defaultPath: defaultFilename,
        filters: [{
          name: 'MP4 Video',
          extensions: ['mp4']
        }]
      });

      if (selectedPath) {
        setOutputPath(selectedPath);
        setError(null);
      }
    } catch (err) {
      setError(`Failed to open file picker: ${err.message}`);
    }
  };

  // Handle export
  const handleExport = async () => {
    // Validation
    if (!outputPath) {
      setError('Please choose an output location first');
      return;
    }

    // Get all clips from all tracks (supports multi-track export with overlays)
    const allClips = clips
      .sort((a, b) => a.startTime - b.startTime);

    if (allClips.length === 0) {
      setError('No clips on timeline to export');
      return;
    }

    // Validate clip metadata before export
    for (const clip of allClips) {
      if (!clip.metadata) {
        setError(`Clip ${clip.id} has missing metadata. Please re-import this media.`);
        return;
      }
      if (!clip.metadata.path) {
        setError(`Clip ${clip.id} has missing file path. Please re-import this media.`);
        return;
      }
      if (!clip.metadata.duration || clip.metadata.duration <= 0) {
        setError(`Clip ${clip.id} has invalid duration. Please re-import this media.`);
        return;
      }
    }

    // Convert to backend format (include track field and audio properties)
    const clipData = allClips.map(c => ({
      id: c.id,
      path: c.metadata.path,
      in_point: c.inPoint || 0,
      out_point: c.outPoint || c.metadata.duration,
      start_time: c.startTime,
      track: c.track || 0,  // Include track field
      volume: c.volume !== undefined ? c.volume : 100,
      is_muted: c.isMuted || false,
      fade_in_duration: c.fadeInDuration || 0,
      fade_out_duration: c.fadeOutDuration || 0,
    }));

    // Export settings
    const settings = {
      resolution: resolution,
      output_path: outputPath,
    };

    try {
      setIsExporting(true);
      setError(null);

      // Prepare transition data for export
      const transitionData = transitions.map(t => ({
        id: t.id,
        clip_id_before: t.clipIdBefore,
        clip_id_after: t.clipIdAfter,
        transition_type: t.type,
        duration: t.duration
      }));

      // Call backend export command
      const result = await exportTimeline(clipData, transitionData, settings);

      // Success
      setSuccess(true);
      setIsExporting(false);
    } catch (err) {
      setError(`Export failed: ${err.message || err}`);
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Export Timeline</h2>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-gray-400 hover:text-white transition disabled:opacity-50"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Preset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Preset (Select for quick setup)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {getPresets().map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  disabled={isExporting}
                  className={`px-3 py-2 rounded text-sm font-medium transition ${
                    selectedPreset === preset.id
                      ? 'bg-blue-600 text-white border border-blue-500'
                      : 'bg-gray-700 text-gray-200 border border-gray-600 hover:bg-gray-600'
                  } disabled:opacity-50`}
                  title={preset.description}
                >
                  {preset.name}
                </button>
              ))}
            </div>
            <button
              onClick={handleCustomToggle}
              disabled={isExporting}
              className={`mt-2 text-xs font-medium transition ${
                showCustomOptions
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-gray-400 hover:text-gray-300'
              } disabled:opacity-50`}
            >
              {showCustomOptions ? '✓ Custom options' : '+ Custom options'}
            </button>
          </div>

          {/* Custom Resolution Selection (shown when custom options enabled or no preset selected) */}
          {showCustomOptions || (!selectedPreset && !showCustomOptions) && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {selectedPreset ? 'Custom Resolution' : 'Resolution'}
              </label>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="resolution"
                    value="source"
                    checked={resolution === 'source'}
                    onChange={(e) => {
                      setResolution(e.target.value);
                      if (selectedPreset) {
                        setSelectedPreset(null);
                        setShowCustomOptions(true);
                      }
                    }}
                    disabled={isExporting}
                    className="mr-2"
                  />
                  <span className="text-gray-200">Source (Original Resolution)</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="resolution"
                    value="720p"
                    checked={resolution === '720p'}
                    onChange={(e) => {
                      setResolution(e.target.value);
                      if (selectedPreset) {
                        setSelectedPreset(null);
                        setShowCustomOptions(true);
                      }
                    }}
                    disabled={isExporting}
                    className="mr-2"
                  />
                  <span className="text-gray-200">720p (1280x720)</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="resolution"
                    value="1080p"
                    checked={resolution === '1080p'}
                    onChange={(e) => {
                      setResolution(e.target.value);
                      if (selectedPreset) {
                        setSelectedPreset(null);
                        setShowCustomOptions(true);
                      }
                    }}
                    disabled={isExporting}
                    className="mr-2"
                  />
                  <span className="text-gray-200">1080p (1920x1080)</span>
                </label>
              </div>
            </div>
          )}

          {/* Preset Info */}
          {selectedPreset && !showCustomOptions && (
            <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded px-4 py-2">
              <p className="text-blue-200 text-sm font-medium">{getPresets().find(p => p.id === selectedPreset)?.description}</p>
              <p className="text-blue-300 text-xs mt-1">{getPresets().find(p => p.id === selectedPreset)?.notes}</p>
            </div>
          )}

          {/* Resolution Selection */}
          <div style={{ display: 'none' }}>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Resolution
            </label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  value="source"
                  checked={resolution === 'source'}
                  onChange={(e) => setResolution(e.target.value)}
                  disabled={isExporting}
                  className="mr-2"
                />
                <span className="text-gray-200">Source (Original Resolution)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  value="720p"
                  checked={resolution === '720p'}
                  onChange={(e) => setResolution(e.target.value)}
                  disabled={isExporting}
                  className="mr-2"
                />
                <span className="text-gray-200">720p (1280x720)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  value="1080p"
                  checked={resolution === '1080p'}
                  onChange={(e) => setResolution(e.target.value)}
                  disabled={isExporting}
                  className="mr-2"
                />
                <span className="text-gray-200">1080p (1920x1080)</span>
              </label>
            </div>
          </div>

          {/* Output Path Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Output Location
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleChooseLocation}
                disabled={isExporting}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Choose Location...
              </button>
              {outputPath && (
                <div className="flex-1 px-3 py-2 bg-gray-900 text-gray-300 rounded text-sm truncate" title={outputPath}>
                  {outputPath.split(/[/\\]/).pop()}
                </div>
              )}
            </div>
          </div>

          {/* Progress Indicator */}
          {isExporting && (
            <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded px-4 py-3">
              <div className="space-y-3">
                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-blue-200 font-medium">{progress.current_operation}</p>
                    <p className="text-blue-300 text-sm font-mono">{Math.round(progress.percentage)}%</p>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div
                      className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
                {/* ETA if available */}
                {progress.eta_seconds && progress.eta_seconds > 0 && (
                  <p className="text-blue-300 text-sm">
                    Estimated time remaining: {Math.ceil(progress.eta_seconds)}s
                  </p>
                )}
                {!progress.eta_seconds && (
                  <p className="text-blue-300 text-sm">
                    This may take a few minutes depending on timeline length
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && !isExporting && (
            <div className="bg-green-900 bg-opacity-30 border border-green-700 rounded px-4 py-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-200 font-medium">Export completed successfully!</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !isExporting && (
            <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded px-4 py-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="text-gray-400 text-xs">
            <p>• Export includes all tracks (overlays rendered as PiP)</p>
            <p>• Video format: H.264 MP4 with AAC audio</p>
            <p>• Quality: CRF 23 (high quality)</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-gray-300 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {success ? 'Close' : 'Cancel'}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !outputPath || success}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
