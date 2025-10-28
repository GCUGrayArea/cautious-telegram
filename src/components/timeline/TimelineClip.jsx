import { useState, useEffect } from 'react';
import { Group, Rect, Text, Image } from 'react-konva';
import { timeToPixels, getTrackY, TIMELINE_CONFIG } from '../../utils/timeline';
import { getAssetUrl } from '../../utils/api';

/**
 * TimelineClip Component
 *
 * Renders a single video clip on the timeline as a Konva Group.
 * Displays thumbnail, filename, and visual boundaries.
 * Supports dragging to reposition clips on the timeline.
 */
function TimelineClip({ clip, selected, onClick, onDragEnd, pixelsPerSecond, scrollX, clips, numTracks = 3 }) {
  const [thumbnailImage, setThumbnailImage] = useState(null);

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
    // Import snap utilities
    const { pixelsToTime, getClipSnapPoints, snapToPoints, getTrackIndexFromY } =
      require('../../utils/timeline');

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

  return (
    <Group
      x={clipX}
      y={clipY + 2} // 2px top padding
      draggable={true}
      dragBoundFunc={handleDragBound}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
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
