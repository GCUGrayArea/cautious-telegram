import { Layer, Line, Text, Rect } from 'react-konva';
import { calculateRulerTicks, TIMELINE_CONFIG } from '../../utils/timeline';

/**
 * TimeRuler Component
 *
 * Renders the time ruler at the top of the timeline, showing time markers
 * and labels (00:00, 00:05, etc.) based on the current zoom level.
 */
function TimeRuler({ width, scrollX, pixelsPerSecond }) {
  const ticks = calculateRulerTicks(width, scrollX, pixelsPerSecond);

  return (
    <Layer>
      {/* Ruler background */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={TIMELINE_CONFIG.RULER_HEIGHT}
        fill="#1f2937"
      />

      {/* Ruler bottom border */}
      <Line
        points={[0, TIMELINE_CONFIG.RULER_HEIGHT, width, TIMELINE_CONFIG.RULER_HEIGHT]}
        stroke="#374151"
        strokeWidth={1}
      />

      {/* Tick marks and labels */}
      {ticks.map((tick, index) => {
        const xPos = tick.x - scrollX;

        // Skip ticks outside viewport
        if (xPos < 0 || xPos > width) {
          return null;
        }

        return (
          <div key={`tick-${index}`}>
            {/* Tick line */}
            <Line
              points={[
                xPos,
                TIMELINE_CONFIG.RULER_HEIGHT - (tick.isMajor ? 15 : 8),
                xPos,
                TIMELINE_CONFIG.RULER_HEIGHT
              ]}
              stroke={tick.isMajor ? '#9ca3af' : '#4b5563'}
              strokeWidth={tick.isMajor ? 2 : 1}
            />

            {/* Time label for major ticks */}
            {tick.isMajor && tick.label && (
              <Text
                x={xPos - 20}
                y={5}
                width={40}
                text={tick.label}
                fontSize={11}
                fill="#9ca3af"
                align="center"
              />
            )}
          </div>
        );
      })}
    </Layer>
  );
}

export default TimeRuler;
