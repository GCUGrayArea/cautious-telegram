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
 * Renders a text overlay on Track 3 of the timeline as a Konva Group.
 * Text overlays are semi-transparent overlays that appear on top of video.
 * Supports dragging to reposition in time and trimming to adjust duration.
 * Text is displayed with customizable font, size, and color.
 */
function TextOverlayClip({ textOverlay, selected, onClick, onDragEnd, onTrimEnd, pixelsPerSecond, scrollX, clips, numTracks = 3 }) {
  const [isTrimming, setIsTrimming] = useState(false);

  // Track 3 is for text overlays - positioned on top of Track 1 (base video)
  const TRACK_3_INDEX = 2; // Zero-indexed, so track 3 = index 2

  // Calculate overlay position and dimensions
  const clipX = timeToPixels(textOverlay.startTime, pixelsPerSecond) - scrollX;
  const trackY = TIMELINE_CONFIG.RULER_HEIGHT + (TRACK_3_INDEX * TIMELINE_CONFIG.TRACK_HEIGHT);
  const clipY = trackY;
  const clipWidth = timeToPixels(textOverlay.duration, pixelsPerSecond);
  const clipHeight = TIMELINE_CONFIG.TRACK_HEIGHT - 4;

  // Overlay colors - Material green by default, pale yellow when selected
  const backgroundColor = selected ? '#fffacd' : '#4caf50'; // Pale yellow when selected, green by default
  const backgroundOpacity = selected ? 0.3 : 0.25; // Slightly less opacity for green
  const borderColor = selected ? '#fbbf24' : '#388e3c'; // Gold border when selected, darker green otherwise
  const borderWidth = selected ? 2 : 1;
  const textColor = textOverlay.color || '#ffffff';

  // Truncate text if too long for display
  const maxTextLength = Math.floor(clipWidth / 7);
  const displayText = textOverlay.text.length > maxTextLength
    ? textOverlay.text.substring(0, maxTextLength - 3) + '...'
    : textOverlay.text;

  // Handle click
  const handleClick = (e) => {
    console.log('TextOverlayClip clicked:', textOverlay.id, 'onClick prop:', typeof onClick);
    e.cancelBubble = true;
    e.evt?.stopPropagation?.();
    if (onClick) {
      console.log('Calling onClick with id:', textOverlay.id);
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

  // Drag bound function - constrains drag position to Track 3 only (horizontal movement)
  const handleDragBound = (pos) => {
    const minX = -scrollX;
    const constrainedX = Math.max(minX, pos.x);
    // Keep Y position locked to Track 3 (don't allow dragging to other tracks)
    // Return clipY to keep at the Track 3 position
    return { x: constrainedX, y: clipY };
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
    <Group
      x={clipX}
      y={clipY}
      draggable={!isTrimming}
      dragBoundFunc={handleDragBound}
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
      {/* Invisible hit area for dragging and clicking */}
      <Rect
        x={0}
        y={0}
        width={Math.max(clipWidth, 20)}
        height={clipHeight}
        fill="rgba(255, 255, 255, 0.01)"
        stroke="transparent"
        listening={false}
      />

      {/* Background - always visible with pale yellow */}
      <Rect
        x={0}
        y={0}
        width={Math.max(clipWidth, 20)}
        height={clipHeight}
        fill={backgroundColor}
        opacity={backgroundOpacity}
        stroke={borderColor}
        strokeWidth={borderWidth}
        listening={false}
        pointerEvents="none"
      />

      {/* Text content - main visual */}
      {clipWidth > 30 && (
        <>
          {/* Subtle background for text readability (black shadow) */}
          <Text
            x={8}
            y={(clipHeight / 2) - 12}
            text={displayText}
            fontSize={16}
            fontFamily={textOverlay.fontFamily || "Arial"}
            fill="#000000"
            opacity={0.3}
            pointerEvents="none"
            width={Math.max(clipWidth - 16, 0)}
            ellipsis
          />
          {/* Actual text overlay */}
          <Text
            x={8}
            y={(clipHeight / 2) - 12}
            text={displayText}
            fontSize={16}
            fontFamily={textOverlay.fontFamily || "Arial"}
            fill={textColor}
            pointerEvents="none"
            width={Math.max(clipWidth - 16, 0)}
            ellipsis
          />
        </>
      )}

      {/* Trim handles (only when selected) */}
      {selected && clipWidth > 10 && (
        <>
          {/* Left trim handle */}
          <Rect
            x={0}
            y={0}
            width={6}
            height={clipHeight}
            fill="#fbbf24"
            draggable
            onDragStart={() => setIsTrimming(true)}
            onDragEnd={handleLeftTrimDragEnd}
            dragBoundFunc={(pos) => ({
              x: Math.max(0, Math.min(pos.x, clipWidth - 10)),
              y: pos.y,
            })}
            cursor="col-resize"
          />

          {/* Right trim handle */}
          <Rect
            x={clipWidth - 6}
            y={0}
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
