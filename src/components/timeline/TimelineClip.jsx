import { useState, useEffect } from 'preact/hooks';
import { Group, Rect, Text, Image } from 'react-konva';
import { timeToPixels, getTrackY, TIMELINE_CONFIG } from '../../utils/timeline';

/**
 * TimelineClip Component
 *
 * Renders a single video clip on the timeline as a Konva Group.
 * Displays thumbnail, filename, and visual boundaries.
 */
function TimelineClip({ clip, selected, onClick, pixelsPerSecond, scrollX }) {
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
      img.src = `asset://localhost/${clip.metadata.thumbnail_path}`;
      img.onload = () => {
        setThumbnailImage(img);
      };
      img.onerror = (err) => {
        console.error('Failed to load thumbnail:', err);
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

  return (
    <Group
      x={clipX}
      y={clipY + 2} // 2px top padding
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
