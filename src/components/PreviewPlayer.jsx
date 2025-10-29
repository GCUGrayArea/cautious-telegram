import { useRef, useEffect, useState } from 'react';
import { useTimeline } from '../store/timelineStore.jsx';
import { getAllClipsAtTime, getClipSourceTime, formatTime, convertToAssetPath } from '../utils/preview';

/**
 * Convert hex color to rgba format
 * @param {string} hex - Hex color code (e.g., '#FFFFFF')
 * @param {number} alpha - Alpha/opacity value (0-1)
 * @returns {string} rgba color string
 */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * PreviewPlayer Component
 *
 * Displays video preview at the current playhead position.
 * Supports Picture-in-Picture for overlapping clips on different tracks.
 * Updates when playhead moves (scrubbing) and handles clip boundaries.
 */
function PreviewPlayer({ currentTime }) {
  const videoRefsRef = useRef({});
  const containerRef = useRef(null);
  const { clips, isPlaying, textOverlays } = useTimeline();
  const [activeClips, setActiveClips] = useState([]);
  const [videoError, setVideoError] = useState(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [activeTextOverlays, setActiveTextOverlays] = useState([]);
  const [containerHeight, setContainerHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Find all clips at the current playhead position (for PiP)
  useEffect(() => {
    const clipsAtTime = getAllClipsAtTime(clips, currentTime);
    setActiveClips(clipsAtTime);
  }, [clips, currentTime]);

  // Find all text overlays at the current playhead position
  useEffect(() => {
    if (!textOverlays || textOverlays.length === 0) {
      setActiveTextOverlays([]);
      return;
    }

    const overlaysAtTime = textOverlays.filter(overlay => {
      const overlayEnd = overlay.startTime + overlay.duration;
      return currentTime >= overlay.startTime && currentTime < overlayEnd;
    });

    setActiveTextOverlays(overlaysAtTime);
  }, [textOverlays, currentTime]);

  // Update video elements when clips or time changes
  useEffect(() => {
    if (activeClips.length === 0) return;

    activeClips.forEach((clip) => {
      const video = videoRefsRef.current[clip.id];
      if (!video) return;

      const sourceTime = getClipSourceTime(clip, currentTime);
      const videoPath = convertToAssetPath(clip.metadata?.path);

      // Set video source if it changed
      if (video.src !== videoPath) {
        video.src = videoPath;

        // When metadata is loaded, seek to the correct time
        const handleLoadedMetadata = () => {
          if (Math.abs(video.currentTime - sourceTime) > 0.1) {
            video.currentTime = sourceTime;
          }
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      } else {
        // Same source, just seek to new time
        if (Math.abs(video.currentTime - sourceTime) > 0.1) {
          video.currentTime = sourceTime;
        }
      }

      // Apply volume and mute settings
      if (clip.isMuted) {
        video.muted = true;
        video.volume = 0;
      } else {
        video.muted = false;
        // Normalize volume from 0-200% range to 0-1 HTML5 range
        video.volume = Math.max(0, Math.min(1, (clip.volume || 100) / 100));
      }
    });
  }, [activeClips, currentTime]);

  // Handle video errors
  const handleVideoError = (e) => {
    console.error('Video playback error:', e);
    setVideoError('Failed to load video. Please check the file path.');
  };

  // Handle video load success
  const handleVideoLoad = () => {
    setVideoError(null);
  };

  // Handle playback state changes for all active videos
  useEffect(() => {
    if (activeClips.length === 0) return;

    activeClips.forEach((clip) => {
      const video = videoRefsRef.current[clip.id];
      if (!video) return;

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
    });
  }, [isPlaying, activeClips]);

  // Track video playback time for display (use first active clip)
  useEffect(() => {
    if (activeClips.length === 0) return;

    const firstClip = activeClips[0];
    const video = videoRefsRef.current[firstClip.id];
    if (!video) return;

    const handleTimeUpdate = () => {
      setVideoCurrentTime(video.currentTime);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [activeClips]);

  // Track container dimensions for responsive layout
  // Use ResizeObserver to detect both width and height changes and force re-centering
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
        setContainerWidth(containerRef.current.clientWidth);

        // Force re-centering by triggering a reflow on video elements
        Object.values(videoRefsRef.current).forEach((video) => {
          if (video) {
            // Force the browser to recalculate the video's layout
            video.style.objectPosition = 'center center';
            // Trigger reflow
            void video.offsetHeight;
          }
        });
      }
    };

    updateDimensions();

    // ResizeObserver detects actual element size changes (more reliable than window resize)
    const resizeObserver = new ResizeObserver(updateDimensions);

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="preview-player flex items-center justify-center w-full h-full bg-black overflow-hidden">
      {activeClips.length > 0 ? (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {/* Render all active clips */}
          {activeClips.map((clip, index) => {
            const isBaseLayer = index === 0;
            const isOverlay = index > 0;

            return (
              <video
                key={clip.id}
                ref={(el) => {
                  if (el) videoRefsRef.current[clip.id] = el;
                }}
                onError={handleVideoError}
                onLoadedData={handleVideoLoad}
                preload="metadata"
                style={{
                  position: isOverlay ? 'absolute' : 'relative',
                  width: isOverlay ? '25%' : '100%',
                  height: isOverlay ? 'auto' : '100%',
                  bottom: isOverlay ? '20px' : 'auto',
                  right: isOverlay ? '20px' : 'auto',
                  zIndex: clip.track,
                  objectFit: 'contain',
                  objectPosition: 'center center',
                  borderRadius: isOverlay ? '8px' : '0',
                  border: isOverlay ? '2px solid rgba(255, 255, 255, 0.3)' : 'none',
                  boxShadow: isOverlay ? '0 4px 12px rgba(0, 0, 0, 0.5)' : 'none'
                }}
              />
            );
          })}

          {/* Error message */}
          {videoError && (
            <div className="text-center absolute z-50">
              <p className="text-red-400 mb-2">⚠ {videoError}</p>
              <p className="text-sm text-gray-500">Clip: {activeClips[0]?.metadata?.filename || 'Unknown'}</p>
            </div>
          )}

          {/* Text overlays - render on top of video */}
          {activeTextOverlays.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-30">
              {activeTextOverlays.map((overlay) => {
                // Calculate baseline font size as 1/16 of container height
                let fontSize = Math.max(12, Math.round(containerHeight * 0.0625)); // 1/16 = 0.0625

                // For longer text, reduce font size to fit within maxWidth
                const estimatedChars = overlay.text.length;
                const estimatedWidthAtBaseline = fontSize * estimatedChars * 0.55; // Rough estimate: char width ~0.55 of font size
                const maxAllowedWidth = Math.round(window.innerWidth * 0.7); // 70% of viewport width

                // If text would overflow, scale it down proportionally
                if (estimatedWidthAtBaseline > maxAllowedWidth) {
                  const scaleFactor = maxAllowedWidth / estimatedWidthAtBaseline;
                  fontSize = Math.max(12, Math.round(fontSize * scaleFactor * 0.9)); // 0.9 for a bit of safety margin
                }

                // Convert y position from center anchor to bottom anchor
                const bottomPercent = 100 - overlay.y;

                // Determine if background should be visible
                const backgroundOpacity = overlay.backgroundOpacity || 0;
                const showBackground = backgroundOpacity > 0;

                return (
                  <div
                    key={overlay.id}
                    style={{
                      position: 'absolute',
                      left: `${overlay.x}%`,
                      bottom: `${bottomPercent}%`,
                      transform: 'translateX(-50%)',
                      fontSize: `${fontSize}px`,
                      fontFamily: overlay.fontFamily || 'Arial',
                      color: overlay.color || '#FFFFFF',
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                      whiteSpace: 'normal',
                      maxWidth: '70%',
                      lineHeight: '1.2',
                      textAlign: 'center',
                      // Background styling
                      backgroundColor: showBackground ? hexToRgba(overlay.backgroundColor || '#000000', backgroundOpacity) : 'transparent',
                      padding: showBackground ? '8px 16px' : '0',
                      borderRadius: showBackground ? '4px' : '0',
                    }}
                  >
                    {overlay.text}
                  </div>
                );
              })}
            </div>
          )}

          {/* Video info overlay - show info for base clip */}
          {activeClips[0] && (
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 rounded px-3 py-2 z-40">
              <p className="text-xs text-white">
                <span className="font-semibold">{activeClips[0].metadata?.filename || 'Unknown'}</span>
                {activeClips.length > 1 && <span className="ml-2 text-blue-400">+{activeClips.length - 1} overlay(s)</span>}
              </p>
              <p className="text-xs text-gray-300">
                {formatTime(getClipSourceTime(activeClips[0], currentTime))} / {formatTime(activeClips[0].metadata?.duration || 0)}
              </p>
              <p className="text-xs text-gray-400">
                {activeClips[0].metadata?.width}x{activeClips[0].metadata?.height} @ {activeClips[0].metadata?.fps || 0}fps
              </p>
            </div>
          )}

          {/* Timeline position indicator */}
          {activeClips[0] && (
            <div className="absolute top-4 left-4 bg-blue-600 bg-opacity-90 rounded px-3 py-2 z-40">
              <p className="text-xs text-gray-300 font-mono mb-1">
                Start play at: {formatTime(currentTime)}
              </p>
              <p className="text-xs text-white font-mono font-semibold">
                Currently playing: {formatTime(activeClips[0].startTime + (videoCurrentTime - activeClips[0].inPoint))}
              </p>
            </div>
          )}
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
