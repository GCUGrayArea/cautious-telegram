import { useEffect } from 'preact/hooks';
import { getAssetUrl, formatFileSize, formatDuration } from '../utils/api';

function MediaDetailModal({ media, onClose }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!media) return null;

  const thumbnailUrl = media.thumbnail_path
    ? getAssetUrl(media.thumbnail_path)
    : null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Media Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
            title="Close (Esc)"
          >
            <svg
              className="w-6 h-6 text-gray-400 hover:text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Thumbnail Preview */}
          <div className="mb-6 bg-gray-900 rounded-lg overflow-hidden">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={media.filename}
                className="w-full h-auto"
              />
            ) : (
              <div className="aspect-video flex items-center justify-center text-gray-600">
                <svg
                  className="w-24 h-24"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-4">
            <MetadataRow label="Filename" value={media.filename} />
            <MetadataRow label="File Path" value={media.path} />

            {media.duration && (
              <MetadataRow
                label="Duration"
                value={formatDuration(media.duration)}
              />
            )}

            {media.width && media.height && (
              <MetadataRow
                label="Resolution"
                value={`${media.width} × ${media.height}`}
              />
            )}

            {media.file_size && (
              <MetadataRow
                label="File Size"
                value={formatFileSize(media.file_size)}
              />
            )}

            {media.format && (
              <MetadataRow label="Format" value={media.format.toUpperCase()} />
            )}

            {media.fps && (
              <MetadataRow label="Frame Rate" value={`${media.fps} fps`} />
            )}

            {media.created_at && (
              <MetadataRow
                label="Imported"
                value={new Date(media.created_at).toLocaleString()}
              />
            )}

            {media.metadata_json && (
              <div className="pt-4 border-t border-gray-700">
                <p className="text-sm font-medium text-gray-400 mb-2">
                  Additional Metadata
                </p>
                <pre className="text-xs text-gray-300 bg-gray-900 p-3 rounded overflow-x-auto">
                  {JSON.stringify(JSON.parse(media.metadata_json), null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function MetadataRow({ label, value }) {
  return (
    <div className="flex items-start">
      <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">
        {label}:
      </span>
      <span className="text-sm text-white break-all">{value}</span>
    </div>
  );
}

export default MediaDetailModal;
