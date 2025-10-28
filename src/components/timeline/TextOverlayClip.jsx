import { useState, useEffect } from 'react';
import { Group, Rect, Text } from 'react-konva';
import {
  timeToPixels,
  TIMELINE_CONFIG,
  pixelsToTime,
  getClipSnapPoints,
  snapToPoints,
} from '../../utils/timeline';

/**
 * TextOverlayClip Component
 *
 * Renders a text overlay on the timeline as a Konva Group.
 * Displays text with customizable font, size, and color.
 * Supports dragging to reposition text overlays on the timeline.
 * Supports trimming via edge handles to adjust duration.
 */
function TextOverlayClip({ textOverlay, selected, onClick, onDragEnd, onTrimEnd, pixelsPerSecond, scrollX, clips, numTracks = 3 }) {
  const [isTrimming, setIsTrimming] = useState(false);

  // Calculate overlay position and dimensions
  const clipX = timeToPixels(textOverlay.startTime, pixelsPerSecond) - scrollX;
  const clipY = TIMELINE_CONFIG.RULER_HEIGHT + (numTracks * TIMELINE_CONFIG.TRACK_HEIGHT) + 10; // Below tracks
  const clipWidth = timeToPixels(textOverlay.duration, pixelsPerSecond);
  const clipHeight = TIMELINE_CONFIG.TRACK_HEIGHT - 4;

  // Overlay colors
  const overlayColor = selected ? '#ef4444' : '#8b5cf6'; // Red if selected, purple otherwise
  const borderColor = selected ? '#dc2626' : '#7c3aed';
  const textColor = '#ffffff';

  // Truncate text if too long for display
  const maxTextLength = Math.floor(clipWidth / 7);
  const displayText = textOverlay.text.length > maxTextLength
    ? textOverlay.text.substring(0, maxTextLength - 3) + '...'
    : textOverlay.text;

  // Handle click
  const handleClick = (e) => {
    e.cancelBubble = true;
    if (onClick) {
      onClick(textOverlay.id);
    }
  };

  // Handle drag end - update overlay position in store
  const handleDragEnd = (e) => {
    if (!onDragEnd) return;

    const newX = e.target.x() + scrollX;
    const newStartTime = Math.max(0, newX / pixelsPerSecond);

    onDragEnd(textOverlay.id, newStartTime);
  };

  // Drag bound function - constrains drag position
  const handleDragBound = (pos) => {
    const minX = -scrollX;
    const constrainedX = Math.max(minX, pos.x);
    return { x: constrainedX, y: pos.y };
  };

  // Handle left trim (resize start)
  const handleLeftTrimDragEnd = (e) => {
    if (!onTrimEnd) return;

    const newX = e.target.x() + scrollX;
    const newStartTime = Math.max(0, newX / pixelsPerSecond);
    const newDuration = textOverlay.startTime + textOverlay.duration - newStartTime;

    if (newDuration > 0.5) { // Minimum 0.5 second duration
      onTrimEnd(textOverlay.id, {
        startTime: newStartTime,
        duration: newDuration,
      });
    }

    setIsTrimming(false);
  };

  // Handle right trim (resize end)
  const handleRightTrimDragEnd = (e) => {
    if (!onTrimEnd) return;

    const newX = e.target.x() + scrollX;
    const newEndTime = newX / pixelsPerSecond;
    const newDuration = newEndTime - textOverlay.startTime;

    if (newDuration > 0.5) { // Minimum 0.5 second duration
      onTrimEnd(textOverlay.id, {
        duration: newDuration,
      });
    }

    setIsTrimming(false);
  };

  return (
    <Group>
      {/* Main overlay background */}
      <Rect
        x={clipX}
        y={clipY}
        width={Math.max(clipWidth, 20)}
        height={clipHeight}
        fill={overlayColor}
        opacity={0.8}
        draggable
        onDragEnd={handleDragEnd}
        dragBoundFunc={handleDragBound}
        onMouseDown={handleClick}
        onClick={handleClick}
      />

      {/* Selection border */}
      {selected && (
        <Rect
          x={clipX}
          y={clipY}
          width={Math.max(clipWidth, 20)}
          height={clipHeight}
          stroke={borderColor}
          strokeWidth={3}
          fill="transparent"
          pointerEvents="none"
        />
      )}

      {/* Text label */}
      {clipWidth > 40 && (
        <Text
          x={clipX + 8}
          y={clipY + (clipHeight / 2) - 8}
          text={displayText}
          fontSize={12}
          fontFamily="Arial"
          fill={textColor}
          pointerEvents="none"
          width={Math.max(clipWidth - 16, 0)}
          ellipsis
        />
      )}

      {/* Trim handles (only when selected) */}
      {selected && clipWidth > 10 && (
        <>
          {/* Left trim handle */}
          <Rect
            x={clipX}
            y={clipY}
            width={6}
            height={clipHeight}
            fill="#fbbf24"
            draggable
            onDragStart={() => setIsTrimming(true)}
            onDragEnd={handleLeftTrimDragEnd}
            dragBoundFunc={(pos) => ({
              x: Math.max(-scrollX, Math.min(pos.x, clipX + clipWidth - 10 - scrollX)),
              y: pos.y,
            })}
            cursor="col-resize"
          />

          {/* Right trim handle */}
          <Rect
            x={clipX + clipWidth - 6}
            y={clipY}
            width={6}
            height={clipHeight}
            fill="#fbbf24"
            draggable
            onDragStart={() => setIsTrimming(true)}
            onDragEnd={handleRightTrimDragEnd}
            dragBoundFunc={(pos) => ({
              x: Math.min(pos.x, Infinity),
              y: pos.y,
            })}
            cursor="col-resize"
          />
        </>
      )}
    </Group>
  );
}

export default TextOverlayClip;
