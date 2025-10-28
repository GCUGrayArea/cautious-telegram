import { useRef, useEffect, useState } from 'react';
import { useTimeline } from '../store/timelineStore.jsx';
import { getClipAtTime, getClipSourceTime, formatTime, convertToAssetPath } from '../utils/preview';

/**
 * PreviewPlayer Component
 *
 * Displays video preview at the current playhead position.
 * Uses HTML5 video element to show the frame from the active clip.
 * Updates when playhead moves (scrubbing) and handles clip boundaries.
 */
function PreviewPlayer({ currentTime }) {
  const videoRef = useRef(null);
  const { clips, isPlaying } = useTimeline();
  const [currentClip, setCurrentClip] = useState(null);
  const [videoError, setVideoError] = useState(null);

  // Find the clip at the current playhead position
  useEffect(() => {
    const clip = getClipAtTime(clips, currentTime);
    setCurrentClip(clip);
  }, [clips, currentTime]);

  // Update video element when clip or time changes
  useEffect(() => {
    if (!videoRef.current || !currentClip) return;

    const video = videoRef.current;
    const sourceTime = getClipSourceTime(currentClip, currentTime);

    // Set video source if it changed
    const videoPath = convertToAssetPath(currentClip.metadata?.path);
    if (video.src !== videoPath) {
      video.src = videoPath;

      // When metadata is loaded, seek to the correct time
      const handleLoadedMetadata = () => {
        if (Math.abs(video.currentTime - sourceTime) > 0.1) {
          video.currentTime = sourceTime;
        }
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);

      // Cleanup listener
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    } else {
      // Same source, just seek to new time
      if (Math.abs(video.currentTime - sourceTime) > 0.1) {
        video.currentTime = sourceTime;
      }
    }
  }, [currentClip, currentTime]);

  // Handle video errors
  const handleVideoError = (e) => {
    console.error('Video playback error:', e);
    setVideoError('Failed to load video. Please check the file path.');
  };

  // Handle video load success
  const handleVideoLoad = () => {
    setVideoError(null);
  };

  // Handle playback state changes
  useEffect(() => {
    if (!videoRef.current || !currentClip) return;

    const video = videoRef.current;

    if (isPlaying) {
      // Start video playback
      video.play().catch(err => {
        console.error('Failed to play video:', err);
        setVideoError('Failed to play video. Please try again.');
      });
    } else {
      // Pause video playback
      video.pause();
    }
  }, [isPlaying, currentClip]);

  return (
    <div className="preview-player flex flex-col items-center justify-center w-full h-full bg-black">
      {currentClip ? (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Video element */}
          <video
            ref={videoRef}
            className="max-w-full max-h-full"
            onError={handleVideoError}
            onLoadedData={handleVideoLoad}
            preload="metadata"
            style={{ display: videoError ? 'none' : 'block' }}
          />

          {/* Error message */}
          {videoError && (
            <div className="text-center">
              <p className="text-red-400 mb-2">⚠ {videoError}</p>
              <p className="text-sm text-gray-500">Clip: {currentClip.metadata?.filename || 'Unknown'}</p>
            </div>
          )}

          {/* Video info overlay */}
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 rounded px-3 py-2">
            <p className="text-xs text-white">
              <span className="font-semibold">{currentClip.metadata?.filename || 'Unknown'}</span>
            </p>
            <p className="text-xs text-gray-300">
              {formatTime(getClipSourceTime(currentClip, currentTime))} / {formatTime(currentClip.metadata?.duration || 0)}
            </p>
            <p className="text-xs text-gray-400">
              {currentClip.metadata?.width}x{currentClip.metadata?.height} @ {currentClip.metadata?.fps || 0}fps
            </p>
          </div>

          {/* Timeline position indicator */}
          <div className="absolute top-4 left-4 bg-blue-600 bg-opacity-90 rounded px-3 py-2">
            <p className="text-xs text-white font-mono">
              {formatTime(currentTime)}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="w-24 h-24 mx-auto text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-gray-400 mb-2">No clip at playhead position</p>
          <p className="text-sm text-gray-600">
            {clips.length === 0
              ? 'Drag a video from the media library to the timeline to get started'
              : 'Move the playhead (red line) to a clip on the timeline'}
          </p>
        </div>
      )}
    </div>
  );
}

export default PreviewPlayer;
