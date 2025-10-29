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
  const [dragStartPos, setDragStartPos] = useState(null);
  const [allowDrag, setAllowDrag] = useState(true); // Flag to disable drag after click

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

  // Handle mouse down - record starting screen position for click detection
  const handleMouseDown = (e) => {
    // Get the actual mouse position from the event, not the element position
    const screenPos = e.evt ? { x: e.evt.clientX, y: e.evt.clientY } : null;
    console.log('TextOverlayClip mouseDown at screen:', screenPos);
    setDragStartPos(screenPos);
  };

  // Handle mouse up - catch pure clicks that don't drag
  const handleMouseUp = (e) => {
    if (!dragStartPos) return;

    const screenEndPos = e.evt ? { x: e.evt.clientX, y: e.evt.clientY } : null;
    console.log('TextOverlayClip mouseUp at screen:', screenEndPos, 'started at:', dragStartPos);

    if (screenEndPos) {
      const distance = Math.sqrt(
        Math.pow(screenEndPos.x - dragStartPos.x, 2) +
        Math.pow(screenEndPos.y - dragStartPos.y, 2)
      );
      console.log('Screen distance on mouseUp:', distance);

      // If barely moved (< 5 pixels), treat as click instead of drag
      if (distance < 5) {
        console.log('Treating as click on mouseUp, calling onClick for id:', textOverlay.id);
        // IMPORTANT: Stop event propagation to prevent Stage's handleStageClick from clearing selection
        e.cancelBubble = true;
        console.log('TextOverlayClip: set cancelBubble to true');
        e.evt?.stopPropagation?.();
        e.evt?.stopImmediatePropagation?.();

        // Disable drag temporarily to prevent dragStart from firing after this click
        setAllowDrag(false);
        console.log('TextOverlayClip: disabled drag to prevent dragStart after click');

        if (onClick) {
          console.log('TextOverlayClip: calling onClick');
          onClick(textOverlay.id);
        }

        // Re-enable drag on next frame so clicks don't prevent future drags
        setTimeout(() => {
          setAllowDrag(true);
          console.log('TextOverlayClip: re-enabled drag');
        }, 0);
      }
    }
    setDragStartPos(null);
  };

  // Handle drag end - called when drag actually happened
  const handleDragEnd = (e) => {
    // Get the actual mouse position from the event (where it ended)
    const screenEndPos = e.evt ? { x: e.evt.clientX, y: e.evt.clientY } : null;

    console.log('TextOverlayClip dragEnd at screen:', screenEndPos, 'started at:', dragStartPos);

    // Only process as drag if we have significant movement
    let wasSignificantDrag = false;

    if (dragStartPos && screenEndPos) {
      const distance = Math.sqrt(
        Math.pow(screenEndPos.x - dragStartPos.x, 2) +
        Math.pow(screenEndPos.y - dragStartPos.y, 2)
      );
      console.log('Screen distance on dragEnd:', distance);

      // If moved >= 5 pixels, it's a real drag
      if (distance >= 5) {
        console.log('Distance >= 5, treating as significant drag');
        wasSignificantDrag = true;
      } else {
        console.log('Distance < 5, ignoring as drag (should have been handled by mouseUp click)');
      }
    } else {
      console.log('No dragStartPos or screenEndPos, ignoring dragEnd');
    }

    if (wasSignificantDrag) {
      // It was a real drag, update position
      if (onDragEnd) {
        const newX = e.target.x() + scrollX;
        const newStartTime = Math.max(0, newX / pixelsPerSecond);
        console.log('Treating as drag on dragEnd, calling onDragEnd with newStartTime:', newStartTime);
        onDragEnd(textOverlay.id, newStartTime);
      }
    }

    setDragStartPos(null);
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
      draggable={!isTrimming && allowDrag}
      dragBoundFunc={handleDragBound}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onDragStart={() => {
        console.log('TextOverlayClip dragStart detected');
      }}
      onDragEnd={handleDragEnd}
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
      {/* Background - always visible and clickable */}
      <Rect
        x={0}
        y={0}
        width={Math.max(clipWidth, 20)}
        height={clipHeight}
        fill={backgroundColor}
        opacity={backgroundOpacity}
        stroke={borderColor}
        strokeWidth={borderWidth}
        listening={true}
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
