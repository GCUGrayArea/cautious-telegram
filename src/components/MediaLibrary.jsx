import { useState, useEffect } from 'preact/hooks';
import {
  getMediaLibrary,
  importVideo,
  deleteMediaItem,
  selectVideoFile,
  getAssetUrl,
  formatFileSize,
  formatDuration,
} from '../utils/api';

function MediaLibrary({ onMediaSelect }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load media library on mount
  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      const mediaList = await getMediaLibrary();
      setMedia(mediaList);
    } catch (err) {
      console.error('Failed to load media library:', err);
      setError('Failed to load media library: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = async () => {
    try {
      const selectedFiles = await selectVideoFile(true);
      if (!selectedFiles) return;

      const filePaths = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
      await handleImportFiles(filePaths);
    } catch (err) {
      console.error('Failed to select files:', err);
      setError('Failed to select files: ' + err);
    }
  };

  const handleImportFiles = async (filePaths) => {
    setImporting(true);
    setError(null);

    try {
      for (const filePath of filePaths) {
        console.log('Importing:', filePath);
        const result = await importVideo(filePath);

        if (result.success) {
          console.log('Import successful:', result.media);
        } else {
          console.error('Import failed:', result.error);
          setError(`Failed to import ${filePath}: ${result.error}`);
        }
      }

      // Reload media library
      await loadMedia();
    } catch (err) {
      console.error('Import error:', err);
      setError('Import error: ' + err);
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteMedia = async (mediaId, e) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this media?')) {
      return;
    }

    try {
      await deleteMediaItem(mediaId);
      await loadMedia();
    } catch (err) {
      console.error('Failed to delete media:', err);
      setError('Failed to delete media: ' + err);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    const videoPaths = files.map((f) => f.path).filter(Boolean);

    if (videoPaths.length > 0) {
      await handleImportFiles(videoPaths);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const filteredMedia = media.filter((item) =>
    item.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">Media Library</h2>
        <button
          onClick={handleImportClick}
          disabled={importing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded transition-colors"
        >
          {importing ? 'Importing...' : 'Import Video'}
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-700">
        <input
          type="text"
          placeholder="Search media..."
          value={searchQuery}
          onInput={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="m-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200">
          {error}
        </div>
      )}

      {/* Media Grid */}
      <div
        className="flex-1 overflow-y-auto p-4"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Loading media library...</p>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p className="text-lg mb-2">No media files yet</p>
            <p className="text-sm">Import videos or drag and drop them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMedia.map((item) => (
              <MediaCard
                key={item.id}
                media={item}
                onDelete={(e) => handleDeleteMedia(item.id, e)}
                onSelect={() => onMediaSelect && onMediaSelect(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MediaCard({ media, onDelete, onSelect }) {
  const thumbnailUrl = media.thumbnail_path
    ? getAssetUrl(media.thumbnail_path)
    : null;

  return (
    <div
      className="group relative bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-700 transition-colors"
      onClick={onSelect}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-900 flex items-center justify-center">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={media.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-gray-600">
            <svg
              className="w-16 h-16"
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

      {/* Info */}
      <div className="p-3">
        <p className="font-medium text-sm truncate" title={media.filename}>
          {media.filename}
        </p>
        <div className="mt-1 text-xs text-gray-400 space-y-1">
          {media.duration && <p>Duration: {formatDuration(media.duration)}</p>}
          {media.width && media.height && (
            <p>
              {media.width}x{media.height}
            </p>
          )}
          {media.file_size && <p>{formatFileSize(media.file_size)}</p>}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        title="Delete"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

export default MediaLibrary;
