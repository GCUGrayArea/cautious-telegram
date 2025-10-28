import { useState, useEffect } from 'react';
import { Group, Rect, Text, Image } from 'react-konva';
import {
  timeToPixels,
  getTrackY,
  TIMELINE_CONFIG,
  pixelsToTime,
  getClipSnapPoints,
  snapToPoints,
  getTrackIndexFromY
} from '../../utils/timeline';
import { getAssetUrl } from '../../utils/api';

/**
 * TimelineClip Component
 *
 * Renders a single video clip on the timeline as a Konva Group.
 * Displays thumbnail, filename, and visual boundaries.
 * Supports dragging to reposition clips on the timeline.
 * Supports trimming via edge handles to adjust in/out points.
 */
function TimelineClip({ clip, selected, onClick, onDragEnd, onTrimEnd, pixelsPerSecond, scrollX, clips, numTracks = 3 }) {
  const [thumbnailImage, setThumbnailImage] = useState(null);
  const [isTrimming, setIsTrimming] = useState(false);

  // Calculate clip position and dimensions
  const clipX = timeToPixels(clip.startTime, pixelsPerSecond) - scrollX;
  const clipY = getTrackY(clip.track);
  const clipWidth = timeToPixels(clip.duration, pixelsPerSecond);
  const clipHeight = TIMELINE_CONFIG.TRACK_HEIGHT - 4; // 2px padding top/bottom

  // Load thumbnail image
  useEffect(() => {
    if (clip.metadata?.thumbnail_path) {
      const img = new window.Image();
      img.src = getAssetUrl(clip.metadata.thumbnail_path);
      img.onload = () => {
        setThumbnailImage(img);
      };
      img.onerror = (err) => {
        console.error('Failed to load thumbnail:', clip.metadata.thumbnail_path, err);
      };
    }
  }, [clip.metadata?.thumbnail_path]);

  // Clip colors
  const clipColor = selected ? '#ef4444' : '#3b82f6'; // Red if selected, blue otherwise
  const borderColor = selected ? '#dc2626' : '#2563eb';
  const textColor = '#ffffff';

  // Truncate filename if too long
  const filename = clip.metadata?.filename || 'Untitled';
  const maxFilenameLength = Math.floor(clipWidth / 7); // Approximate characters that fit
  const displayFilename = filename.length > maxFilenameLength
    ? filename.substring(0, maxFilenameLength - 3) + '...'
    : filename;

  // Handle click
  const handleClick = (e) => {
    e.cancelBubble = true; // Prevent click from propagating to stage
    if (onClick) {
      onClick(clip.id);
    }
  };

  // Handle drag end - update clip position in store
  const handleDragEnd = (e) => {
    if (!onDragEnd) return;

    const newX = e.target.x() + scrollX; // Account for scroll offset
    const newY = e.target.y() - 2; // Remove padding

    // Convert pixel position to timeline coordinates
    const newStartTime = newX / pixelsPerSecond;

    // Calculate which track based on Y position
    const trackHeight = TIMELINE_CONFIG.TRACK_HEIGHT;
    const rulerHeight = TIMELINE_CONFIG.RULER_HEIGHT;
    let newTrack = Math.floor((newY - rulerHeight) / trackHeight);

    // Constrain to valid track range
    newTrack = Math.max(0, Math.min(newTrack, numTracks - 1));

    // Call parent handler with new position
    onDragEnd(clip.id, Math.max(0, newStartTime), newTrack);
  };

  // Drag bound function - constrains and snaps drag position
  const handleDragBound = (pos) => {
    // Constrain horizontal: Don't allow dragging before timeline start
    const minX = -scrollX;
    const constrainedX = Math.max(minX, pos.x);

    // Constrain vertical: Snap to nearest track
    const trackIndex = getTrackIndexFromY(pos.y - 2); // Remove padding
    const validTrackIndex = Math.max(0, Math.min(trackIndex === -1 ? 0 : trackIndex, numTracks - 1));
    const constrainedY = getTrackY(validTrackIndex);

    // Apply snapping to adjacent clip edges (only clips on same track, excluding self)
    const absoluteX = constrainedX + scrollX;
    const sameTrackClips = (clips || []).filter(c => c.id !== clip.id && c.track === validTrackIndex);
    const snapPoints = getClipSnapPoints(sameTrackClips, pixelsPerSecond);
    const snappedX = snapToPoints(absoluteX, snapPoints) - scrollX;

    return {
      x: snappedX,
      y: constrainedY + 2, // Add padding back
    };
  };

  // Handle drag start
  const handleDragStart = (e) => {
    console.log('🎬 [TimelineClip] Drag started for clip:', clip.id);
  };

  // Handle drag move
  const handleDragMove = (e) => {
    console.log('🎬 [TimelineClip] Dragging clip:', clip.id, 'to', e.target.x(), e.target.y());
  };

  // Trim handle dimensions
  const trimHandleWidth = 10;
  const trimHandleColor = selected ? '#fbbf24' : 'rgba(255, 255, 255, 0.2)'; // Yellow if selected, subtle white otherwise

  // Get source duration from metadata
  const sourceDuration = clip.metadata?.duration || clip.duration;
  const MIN_CLIP_DURATION = 0.1; // Minimum 0.1 seconds

  // Left trim handle drag end
  const handleLeftTrimEnd = (e) => {
    e.cancelBubble = true; // Prevent event from reaching parent Group
    if (!onTrimEnd) return;
    setIsTrimming(false);

    const deltaX = e.target.x(); // How far the handle moved from its original position (0)
    const deltaTime = pixelsToTime(deltaX, pixelsPerSecond);

    // Calculate new values
    let newInPoint = clip.inPoint + deltaTime;
    let newDuration = clip.duration - deltaTime;

    // Constrain inPoint to valid range [0, outPoint - MIN_DURATION]
    newInPoint = Math.max(0, Math.min(newInPoint, clip.outPoint - MIN_CLIP_DURATION));

    // Recalculate based on constrained inPoint
    const actualDelta = newInPoint - clip.inPoint;
    newDuration = clip.outPoint - newInPoint;

    // Calculate new start time to preserve END position on timeline
    // When trimming from left, clip moves right by the trim amount
    const newStartTime = clip.startTime + actualDelta;

    // Ensure duration is valid
    if (newDuration < MIN_CLIP_DURATION) {
      return; // Don't apply trim if it would make clip too small
    }

    console.log('✂️ [TimelineClip] Left trim:', {
      clipId: clip.id,
      oldInPoint: clip.inPoint,
      newInPoint,
      oldStartTime: clip.startTime,
      newStartTime,
      oldDuration: clip.duration,
      newDuration,
    });

    // Call trim handler - move clip right to preserve end position
    onTrimEnd(clip.id, {
      inPoint: newInPoint,
      duration: newDuration,
      startTime: newStartTime,
    });
  };

  // Right trim handle drag end
  const handleRightTrimEnd = (e) => {
    e.cancelBubble = true; // Prevent event from reaching parent Group
    if (!onTrimEnd) return;
    setIsTrimming(false);

    const deltaX = e.target.x() - (clipWidth - trimHandleWidth); // How far from original position
    const deltaTime = pixelsToTime(deltaX, pixelsPerSecond);

    // Calculate new values
    let newOutPoint = clip.outPoint + deltaTime;
    let newDuration = clip.duration + deltaTime;

    // Constrain outPoint to valid range [inPoint + MIN_DURATION, sourceDuration]
    newOutPoint = Math.max(clip.inPoint + MIN_CLIP_DURATION, Math.min(newOutPoint, sourceDuration));

    // Recalculate based on constrained outPoint
    newDuration = newOutPoint - clip.inPoint;

    // Ensure duration is valid
    if (newDuration < MIN_CLIP_DURATION) {
      return; // Don't apply trim if it would make clip too small
    }

    console.log('✂️ [TimelineClip] Right trim:', {
      clipId: clip.id,
      oldOutPoint: clip.outPoint,
      newOutPoint,
      oldDuration: clip.duration,
      newDuration,
    });

    // Call trim handler
    onTrimEnd(clip.id, {
      outPoint: newOutPoint,
      duration: newDuration,
      startTime: clip.startTime, // Preserve timeline position
    });
  };

  // Drag bound for left trim handle - only allow horizontal movement
  const handleLeftTrimBound = (pos) => {
    // Calculate max drag distance right (can't trim beyond MIN_CLIP_DURATION)
    const maxTrimTime = clip.duration - MIN_CLIP_DURATION;
    const maxDragX = timeToPixels(maxTrimTime, pixelsPerSecond);

    // Allow dragging right to trim, but not past the clip's remaining duration
    return {
      x: Math.max(0, Math.min(pos.x, maxDragX)),
      y: 0,
    };
  };

  // Drag bound for right trim handle - only allow horizontal movement
  const handleRightTrimBound = (pos) => {
    // Calculate max drag distance (can't trim beyond MIN_DURATION or source end)
    const maxTrimLeftTime = -(clip.duration - MIN_CLIP_DURATION);
    const maxTrimRightTime = sourceDuration - clip.outPoint;
    const maxDragLeftX = timeToPixels(maxTrimLeftTime, pixelsPerSecond);
    const maxDragRightX = timeToPixels(maxTrimRightTime, pixelsPerSecond);

    const baseX = clipWidth - trimHandleWidth;
    return {
      x: Math.max(baseX + maxDragLeftX, Math.min(pos.x, baseX + maxDragRightX)),
      y: 0,
    };
  };

  return (
    <Group
      x={clipX}
      y={clipY + 2} // 2px top padding
      draggable={!isTrimming} // Disable clip drag when trimming
      dragBoundFunc={handleDragBound}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
      onMouseEnter={(e) => {
        if (!isTrimming) {
          const container = e.target.getStage().container();
          container.style.cursor = 'grab';
        }
      }}
      onMouseLeave={(e) => {
        const container = e.target.getStage().container();
        container.style.cursor = 'default';
      }}
    >
      {/* Clip background */}
      <Rect
        width={clipWidth}
        height={clipHeight}
        fill={clipColor}
        cornerRadius={4}
        shadowColor="rgba(0, 0, 0, 0.3)"
        shadowBlur={4}
        shadowOffset={{ x: 0, y: 2 }}
      />

      {/* Clip border (thicker if selected) */}
      <Rect
        width={clipWidth}
        height={clipHeight}
        stroke={borderColor}
        strokeWidth={selected ? 3 : 1}
        cornerRadius={4}
      />

      {/* Thumbnail image (if loaded and clip is wide enough) */}
      {thumbnailImage && clipWidth >= 60 && (
        <Image
          image={thumbnailImage}
          x={4}
          y={4}
          width={Math.min(clipWidth - 8, 80)}
          height={clipHeight - 8}
          cornerRadius={2}
        />
      )}

      {/* Filename text */}
      {clipWidth >= 40 && (
        <Text
          x={thumbnailImage && clipWidth >= 60 ? 90 : 8}
          y={8}
          text={displayFilename}
          fontSize={12}
          fill={textColor}
          fontFamily="Arial, sans-serif"
          fontStyle="bold"
        />
      )}

      {/* Duration text (on second line if space available) */}
      {clipWidth >= 60 && (
        <Text
          x={thumbnailImage && clipWidth >= 60 ? 90 : 8}
          y={24}
          text={formatDuration(clip.duration)}
          fontSize={10}
          fill={textColor}
          fontFamily="Arial, sans-serif"
          opacity={0.9}
        />
      )}

      {/* Left trim handle (only show when selected) */}
      {selected && (
        <Group>
          {/* Trim handle background (makes it easier to grab) */}
          <Rect
            x={0}
            y={0}
            width={trimHandleWidth}
            height={clipHeight}
            fill={trimHandleColor}
            draggable={true}
            dragBoundFunc={handleLeftTrimBound}
            onDragStart={(e) => {
              e.cancelBubble = true; // Prevent parent Group from dragging
              setIsTrimming(true);
            }}
            onDragMove={(e) => {
              e.cancelBubble = true; // Prevent parent Group drag events
            }}
            onDragEnd={handleLeftTrimEnd}
            onMouseEnter={(e) => {
              const container = e.target.getStage().container();
              container.style.cursor = 'ew-resize';
            }}
            onMouseLeave={(e) => {
              if (!isTrimming) {
                const container = e.target.getStage().container();
                container.style.cursor = 'default';
              }
            }}
          />
          {/* Visual indicator (vertical line) */}
          <Rect
            x={2}
            y={clipHeight / 4}
            width={2}
            height={clipHeight / 2}
            fill="#ffffff"
            opacity={0.8}
            listening={false}
          />
        </Group>
      )}

      {/* Right trim handle (only show when selected) */}
      {selected && (
        <Group>
          {/* Trim handle background */}
          <Rect
            x={clipWidth - trimHandleWidth}
            y={0}
            width={trimHandleWidth}
            height={clipHeight}
            fill={trimHandleColor}
            draggable={true}
            dragBoundFunc={handleRightTrimBound}
            onDragStart={(e) => {
              e.cancelBubble = true; // Prevent parent Group from dragging
              setIsTrimming(true);
            }}
            onDragMove={(e) => {
              e.cancelBubble = true; // Prevent parent Group drag events
            }}
            onDragEnd={handleRightTrimEnd}
            onMouseEnter={(e) => {
              const container = e.target.getStage().container();
              container.style.cursor = 'ew-resize';
            }}
            onMouseLeave={(e) => {
              if (!isTrimming) {
                const container = e.target.getStage().container();
                container.style.cursor = 'default';
              }
            }}
          />
          {/* Visual indicator (vertical line) */}
          <Rect
            x={clipWidth - trimHandleWidth + 6}
            y={clipHeight / 4}
            width={2}
            height={clipHeight / 2}
            fill="#ffffff"
            opacity={0.8}
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
}

/**
 * Format duration in seconds to MM:SS format
 */
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default TimelineClip;
