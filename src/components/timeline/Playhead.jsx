import { useRef } from 'preact/hooks';
import { Group, Line, Rect, Circle } from 'react-konva';
import { TIMELINE_CONFIG, timeToPixels } from '../../utils/timeline';

/**
 * Playhead Component
 *
 * Renders the playhead indicator showing the current playback position.
 * The playhead can be dragged to scrub through the timeline.
 */
function Playhead({
  currentTime,
  height,
  scrollX,
  pixelsPerSecond,
  onTimeChange,
  draggable = true
}) {
  const groupRef = useRef(null);

  // Calculate playhead X position based on current time
  const xPos = timeToPixels(currentTime, pixelsPerSecond) - scrollX;

  const handleDragMove = (e) => {
    if (!onTimeChange) return;

    const newX = e.target.x();
    const newTime = (newX + scrollX) / pixelsPerSecond;

    // Constrain to positive time values
    const constrainedTime = Math.max(0, newTime);

    onTimeChange(constrainedTime);
  };

  const handleDragEnd = (e) => {
    // Snap back to correct position after drag
    e.target.x(xPos);
  };

  return (
    <Group
      ref={groupRef}
      x={xPos}
      y={0}
      draggable={draggable}
      dragBoundFunc={(pos) => {
        // Constrain dragging to horizontal only
        return {
          x: Math.max(0, pos.x),
          y: 0
        };
      }}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {/* Playhead handle (draggable top part) */}
      <Group>
        {/* Triangle handle */}
        <Line
          points={[0, 0, -8, 15, 8, 15]}
          closed
          fill="#ef4444"
          stroke="#dc2626"
          strokeWidth={1}
        />

        {/* Circle top */}
        <Circle
          x={0}
          y={8}
          radius={4}
          fill="#ef4444"
          stroke="#dc2626"
          strokeWidth={1}
        />
      </Group>

      {/* Vertical line extending down the timeline */}
      <Line
        points={[0, 15, 0, height]}
        stroke="#ef4444"
        strokeWidth={TIMELINE_CONFIG.PLAYHEAD_WIDTH}
        opacity={0.8}
        listening={false} // Don't capture mouse events on the line
      />
    </Group>
  );
}

export default Playhead;
