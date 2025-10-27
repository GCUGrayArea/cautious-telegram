import { useState, useRef, useEffect } from 'preact/hooks';
import { Stage, Layer, Rect, Text, Line } from 'react-konva';
import TimeRuler from './timeline/TimeRuler';
import Playhead from './timeline/Playhead';
import TimelineClip from './timeline/TimelineClip';
import { TIMELINE_CONFIG, applyZoom, getTrackY } from '../utils/timeline';
import { useTimeline } from '../store/timelineStore.jsx';

/**
 * Timeline Component
 *
 * Main timeline editor using Konva.js canvas. Provides time ruler, playhead,
 * multi-track layout, and zoom/pan controls.
 */
function Timeline() {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 300 });

  // Timeline store for clips
  const { clips, selectedClipId, selectClip, clearSelection } = useTimeline();

  // Timeline state
  const [currentTime, setCurrentTime] = useState(0); // Current playhead time in seconds
  const [scrollX, setScrollX] = useState(0); // Horizontal scroll position
  const [pixelsPerSecond, setPixelsPerSecond] = useState(TIMELINE_CONFIG.PIXELS_PER_SECOND);
  const [isDragging, setIsDragging] = useState(false);

  // Number of tracks to display
  const numTracks = 3;
  const totalHeight = TIMELINE_CONFIG.RULER_HEIGHT + (numTracks * TIMELINE_CONFIG.TRACK_HEIGHT);

  // Handle window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: Math.max(totalHeight, rect.height)
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [totalHeight]);

  // Handle zoom with mouse wheel (Ctrl+Scroll)
  const handleWheel = (e) => {
    if (e.evt.ctrlKey) {
      e.evt.preventDefault();
      const delta = -e.evt.deltaY;
      const newPixelsPerSecond = applyZoom(pixelsPerSecond, delta);
      setPixelsPerSecond(newPixelsPerSecond);
    } else {
      // Regular scroll for horizontal panning
      const newScrollX = Math.max(0, scrollX + e.evt.deltaY);
      setScrollX(newScrollX);
    }
  };

  // Handle click on timeline to jump playhead or clear selection
  const handleStageClick = (e) => {
    // Only handle clicks on the stage background, not on other elements
    if (e.target === e.target.getStage()) {
      const clickX = e.evt.layerX + scrollX;
      const newTime = clickX / pixelsPerSecond;
      setCurrentTime(Math.max(0, newTime));
      // Clear clip selection when clicking empty timeline
      clearSelection();
    }
  };

  // Handle clip selection
  const handleClipClick = (clipId) => {
    selectClip(clipId);
  };

  // Handle playhead time change from dragging
  const handlePlayheadTimeChange = (newTime) => {
    setCurrentTime(newTime);
  };

  // Render track backgrounds
  const renderTracks = () => {
    const tracks = [];

    for (let i = 0; i < numTracks; i++) {
      const y = getTrackY(i);

      tracks.push(
        <div key={`track-${i}`}>
          {/* Track background */}
          <Rect
            x={0}
            y={y}
            width={dimensions.width}
            height={TIMELINE_CONFIG.TRACK_HEIGHT}
            fill={i % 2 === 0 ? '#111827' : '#1f2937'}
          />

          {/* Track separator line */}
          <Line
            points={[0, y + TIMELINE_CONFIG.TRACK_HEIGHT, dimensions.width, y + TIMELINE_CONFIG.TRACK_HEIGHT]}
            stroke="#374151"
            strokeWidth={1}
          />

          {/* Track label */}
          <Text
            x={10}
            y={y + (TIMELINE_CONFIG.TRACK_HEIGHT / 2) - 8}
            text={`Track ${i + 1}`}
            fontSize={12}
            fill="#6b7280"
          />
        </div>
      );
    }

    return tracks;
  };

  return (
    <div
      ref={containerRef}
      className="timeline-container bg-gray-900 border-t border-gray-700 overflow-hidden"
      style={{ height: '250px', position: 'relative' }}
    >
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-2 bg-gray-800 rounded px-2 py-1">
        <button
          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => setPixelsPerSecond(applyZoom(pixelsPerSecond, -1))}
          title="Zoom Out (Ctrl + Scroll Down)"
        >
          -
        </button>
        <span className="text-xs text-gray-400 px-2 py-1">
          {Math.round(pixelsPerSecond)}px/s
        </span>
        <button
          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => setPixelsPerSecond(applyZoom(pixelsPerSecond, 1))}
          title="Zoom In (Ctrl + Scroll Up)"
        >
          +
        </button>
      </div>

      {/* Current time display */}
      <div className="absolute top-2 left-2 z-10 bg-gray-800 rounded px-3 py-1">
        <span className="text-xs text-gray-400">
          Time: {currentTime.toFixed(2)}s
        </span>
      </div>

      {/* Konva Stage */}
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onWheel={handleWheel}
        onClick={handleStageClick}
        style={{ cursor: isDragging ? 'grabbing' : 'default' }}
      >
        {/* Track layers */}
        <Layer>
          {renderTracks()}
        </Layer>

        {/* Clips layer */}
        <Layer>
          {clips.map(clip => (
            <TimelineClip
              key={clip.id}
              clip={clip}
              selected={clip.id === selectedClipId}
              onClick={handleClipClick}
              pixelsPerSecond={pixelsPerSecond}
              scrollX={scrollX}
            />
          ))}
        </Layer>

        {/* Time ruler layer */}
        <TimeRuler
          width={dimensions.width}
          scrollX={scrollX}
          pixelsPerSecond={pixelsPerSecond}
        />

        {/* Playhead layer (rendered on top) */}
        <Layer>
          <Playhead
            currentTime={currentTime}
            height={dimensions.height}
            scrollX={scrollX}
            pixelsPerSecond={pixelsPerSecond}
            onTimeChange={handlePlayheadTimeChange}
            draggable={true}
          />
        </Layer>
      </Stage>

      {/* Instructions */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-500">
        <p>Ctrl+Scroll: Zoom | Scroll: Pan | Click: Jump playhead | Drag red handle: Scrub</p>
      </div>
    </div>
  );
}

export default Timeline;
