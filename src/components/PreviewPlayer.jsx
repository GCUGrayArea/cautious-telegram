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
 * Calculate opacity for a clip during a transition
 * @param {Object} clip - The clip to calculate opacity for
 * @param {Object} transitionInfo - Transition info { transition, clipBefore, clipAfter, progress }
 * @returns {number} Opacity value 0-1
 */
function calculateTransitionOpacity(clip, transitionInfo) {
  if (!transitionInfo) return 1;

  const { transition, clipBefore, clipAfter, progress } = transitionInfo;
  const isBeforeClip = clip.id === clipBefore.id;
  const isAfterClip = clip.id === clipAfter.id;

  if (!isBeforeClip && !isAfterClip) return 1; // Not part of transition

  const type = transition.type;

  if (type === 'crossfade' || type === 'dissolve') {
    // Crossfade: both clips visible, opacity changes linearly
    return isBeforeClip ? 1 - progress : progress;
  } else if (type === 'fade') {
    // Fade: fade out first clip, then fade in second clip
    if (progress < 0.5) {
      return isBeforeClip ? 1 - (progress * 2) : 0;
    } else {
      return isBeforeClip ? 0 : (progress - 0.5) * 2;
    }
  } else if (type === 'fadeToBlack') {
    // Fade to black: fade out first, fade in second with black in between
    if (progress < 0.4) {
      return isBeforeClip ? 1 - (progress / 0.4) : 0;
    } else if (progress > 0.6) {
      return isBeforeClip ? 0 : (progress - 0.6) / 0.4;
    } else {
      return 0; // Black screen in middle
    }
  } else if (type === 'wipeLeft' || type === 'wipeRight') {
    // For wipe transitions, we'll just use crossfade for now (actual wipe would need CSS clip-path)
    return isBeforeClip ? 1 - progress : progress;
  } else {
    // Default to crossfade
    return isBeforeClip ? 1 - progress : progress;
  }
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
  const { clips, isPlaying, textOverlays, transitions } = useTimeline();
  const [activeClips, setActiveClips] = useState([]);
  const [videoError, setVideoError] = useState(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [activeTextOverlays, setActiveTextOverlays] = useState([]);
  const [containerHeight, setContainerHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeTransition, setActiveTransition] = useState(null);

  // Find all clips at the current playhead position (for PiP) and check for transitions
  useEffect(() => {
    const clipsAtTime = getAllClipsAtTime(clips, currentTime);

    // Check if we're currently in a transition
    let transitionInfo = null;
    for (const transition of transitions || []) {
      const clipBefore = clips.find(c => c.id === transition.clipIdBefore);
      const clipAfter = clips.find(c => c.id === transition.clipIdAfter);

      if (!clipBefore || !clipAfter) continue;

      // Calculate transition boundary time
      const boundaryTime = clipBefore.startTime + (clipBefore.outPoint - clipBefore.inPoint);
      const transitionStart = boundaryTime - (transition.duration / 2);
      const transitionEnd = boundaryTime + (transition.duration / 2);

      if (currentTime >= transitionStart && currentTime <= transitionEnd) {
        // We're in this transition!
        const progress = (currentTime - transitionStart) / transition.duration;
        transitionInfo = {
          transition,
          clipBefore,
          clipAfter,
          progress: Math.max(0, Math.min(1, progress)),
        };

        // Make sure both clips are included in activeClips
        if (!clipsAtTime.find(c => c.id === clipBefore.id)) {
          clipsAtTime.push(clipBefore);
        }
        if (!clipsAtTime.find(c => c.id === clipAfter.id)) {
          clipsAtTime.push(clipAfter);
        }

        break; // Only one transition at a time
      }
    }

    setActiveClips(clipsAtTime);
    setActiveTransition(transitionInfo);
  }, [clips, currentTime, transitions]);

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

      // Apply volume and mute settings with fade envelope
      if (clip.isMuted) {
        video.muted = true;
        video.volume = 0;
      } else {
        video.muted = false;

        // Get the base volume (0-200% normalized to 0-1)
        let baseVolume = Math.max(0, Math.min(1, (clip.volume || 100) / 100));

        // Calculate position within the clip (relative to clip start)
        const positionInClip = currentTime - clip.startTime;
        const clipDuration = clip.outPoint - clip.inPoint;

        // Apply fade in envelope
        const fadeInDuration = clip.fadeInDuration || 0;
        if (fadeInDuration > 0 && positionInClip < fadeInDuration) {
          // Linear fade in from 0 to baseVolume
          baseVolume *= (positionInClip / fadeInDuration);
        }

        // Apply fade out envelope
        const fadeOutDuration = clip.fadeOutDuration || 0;
        if (fadeOutDuration > 0) {
          const fadeOutStart = clipDuration - fadeOutDuration;
          if (positionInClip > fadeOutStart) {
            // Linear fade out from baseVolume to 0
            const fadeOutProgress = (positionInClip - fadeOutStart) / fadeOutDuration;
            baseVolume *= (1 - fadeOutProgress);
          }
        }

        video.volume = Math.max(0, Math.min(1, baseVolume));
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
            const transitionOpacity = calculateTransitionOpacity(clip, activeTransition);

            // Check if this clip is part of a transition
            const isInTransition = activeTransition &&
              (clip.id === activeTransition.clipBefore.id || clip.id === activeTransition.clipAfter.id);

            // Overlays are clips on track 1+, unless they're part of a transition
            const isOverlay = !isInTransition && index > 0 && clip.track > 0;

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
                  position: isOverlay || isInTransition ? 'absolute' : 'relative',
                  width: isOverlay ? '25%' : '100%',
                  height: isOverlay ? 'auto' : '100%',
                  bottom: isOverlay ? '20px' : 'auto',
                  right: isOverlay ? '20px' : 'auto',
                  top: isInTransition ? 0 : 'auto',
                  left: isInTransition ? 0 : 'auto',
                  zIndex: isInTransition ? (clip.id === activeTransition.clipAfter.id ? 2 : 1) : clip.track,
                  objectFit: 'contain',
                  objectPosition: 'center center',
                  borderRadius: isOverlay ? '8px' : '0',
                  border: isOverlay ? '2px solid rgba(255, 255, 255, 0.3)' : 'none',
                  boxShadow: isOverlay ? '0 4px 12px rgba(0, 0, 0, 0.5)' : 'none',
                  opacity: transitionOpacity,
                  transition: 'opacity 0.1s linear',
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
