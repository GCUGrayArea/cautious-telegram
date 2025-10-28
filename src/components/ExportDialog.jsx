/**
 * Export Dialog Component
 *
 * Modal dialog for exporting timeline to video file.
 * Features:
 * - Resolution selection (Source, 720p, 1080p)
 * - File save picker
 * - Export progress indication
 * - Success/error messaging
 */
import { useState, useEffect } from 'react';
import { save } from '@tauri-apps/api/dialog';
import { useTimeline } from '../store/timelineStore';
import { exportTimeline } from '../utils/api';

export default function ExportDialog({ isOpen, onClose }) {
  const { clips } = useTimeline();

  // Component state
  const [resolution, setResolution] = useState('source');
  const [outputPath, setOutputPath] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setResolution('source');
      setOutputPath('');
      setError(null);
      setSuccess(false);
      setIsExporting(false);
    }
  }, [isOpen]);

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

    // Convert to backend format (include track field for multi-track support)
    const clipData = allClips.map(c => ({
      id: c.id,
      path: c.metadata.path,
      in_point: c.inPoint || 0,
      out_point: c.outPoint || c.metadata.duration,
      start_time: c.startTime,
      track: c.track || 0,  // Include track field
    }));

    // Export settings
    const settings = {
      resolution: resolution,
      output_path: outputPath,
    };

    try {
      setIsExporting(true);
      setError(null);

      // Call backend export command
      const result = await exportTimeline(clipData, settings);

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
          {/* Resolution Selection */}
          <div>
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
              <div className="flex items-center gap-3">
                <div className="spinner-border animate-spin inline-block w-5 h-5 border-3 border-blue-500 border-t-transparent rounded-full"></div>
                <div>
                  <p className="text-blue-200 font-medium">Exporting video...</p>
                  <p className="text-blue-300 text-sm">This may take a few minutes depending on timeline length</p>
                </div>
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
