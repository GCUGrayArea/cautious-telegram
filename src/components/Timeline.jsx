import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Line } from 'react-konva';
import TimeRuler from './timeline/TimeRuler';
import Playhead from './timeline/Playhead';
import TimelineClip from './timeline/TimelineClip';
import {
  TIMELINE_CONFIG,
  applyZoom,
  getTrackY,
  pixelsToTime,
  getTrackIndexFromY,
  getClipSnapPoints,
  snapToPoints,
} from '../utils/timeline';
import { useTimeline } from '../store/timelineStore.jsx';
import { useDrag } from '../store/dragStore.jsx';

/**
 * Timeline Component
 *
 * Main timeline editor using Konva.js canvas. Provides time ruler, playhead,
 * multi-track layout, and zoom/pan controls.
 */
function Timeline() {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 300 });

  // Timeline store for clips and playhead time
  const { clips, selectedClipId, playheadTime, selectClip, clearSelection, addClip, updateClip, setPlayheadTime } = useTimeline();

  // Drag store for custom drag-drop
  const { draggedItem, isDragging: isExternalDragActive, endDrag } = useDrag();

  // Timeline state (currentTime is local, synced to store)
  const [currentTime, setCurrentTime] = useState(playheadTime);
  const [scrollX, setScrollX] = useState(0); // Horizontal scroll position
  const [pixelsPerSecond, setPixelsPerSecond] = useState(TIMELINE_CONFIG.PIXELS_PER_SECOND);
  const [isDragging, setIsDragging] = useState(false);
  const [dropIndicator, setDropIndicator] = useState(null); // { x, y, track, width }
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 }); // Track mouse for custom drag

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

  // Handle clip drag end - update clip position in store
  const handleClipDragEnd = (clipId, newStartTime, newTrack) => {
    updateClip(clipId, {
      startTime: newStartTime,
      track: newTrack,
    });
  };

  // Handle playhead time change from dragging
  const handlePlayheadTimeChange = (newTime) => {
    setCurrentTime(newTime);
    setPlayheadTime(newTime); // Sync to store for PreviewPlayer
  };

  // Sync currentTime to store whenever it changes
  useEffect(() => {
    setPlayheadTime(currentTime);
  }, [currentTime, setPlayheadTime]);

  // Handle custom drag - track mouse position and show drop indicator
  const handleMouseMove = (e) => {
    if (!isExternalDragActive || !draggedItem) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left + scrollX;
    const mouseY = e.clientY - rect.top;

    setMousePosition({ x: mouseX, y: mouseY });

    // Calculate drop position
    const dropTime = pixelsToTime(mouseX, pixelsPerSecond);
    const trackIndex = getTrackIndexFromY(mouseY);

    // Snap to existing clip edges
    const snapPoints = getClipSnapPoints(clips, pixelsPerSecond);
    const snappedX = snapToPoints(mouseX, snapPoints);
    const snappedTime = pixelsToTime(snappedX, pixelsPerSecond);

    if (draggedItem.duration) {
      setDropIndicator({
        x: snappedX,
        y: mouseY,
        track: Math.max(0, trackIndex),
        time: snappedTime,
        width: draggedItem.duration * pixelsPerSecond,
      });
    }
  };

  // Handle custom drop
  const handleMouseUp = (e) => {
    if (!isExternalDragActive || !draggedItem) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dropX = e.clientX - rect.left + scrollX;
    const dropY = e.clientY - rect.top;

    const dropTime = pixelsToTime(dropX, pixelsPerSecond);
    const trackIndex = getTrackIndexFromY(dropY);

    const snapPoints = getClipSnapPoints(clips, pixelsPerSecond);
    const snappedX = snapToPoints(dropX, snapPoints);
    const snappedTime = pixelsToTime(snappedX, pixelsPerSecond);

    const validTrackIndex = Math.max(0, Math.min(trackIndex === -1 ? 0 : trackIndex, numTracks - 1));

    // Add clip to timeline
    addClip({
      mediaId: draggedItem.id,
      startTime: Math.max(0, snappedTime),
      duration: draggedItem.duration,
      track: validTrackIndex,
      metadata: draggedItem,
    });

    // Clear drop indicator
    setDropIndicator(null);
    endDrag();
  };

  // Handle drag over timeline
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    // Calculate drop position
    const rect = containerRef.current.getBoundingClientRect();
    const dropX = e.clientX - rect.left + scrollX;
    const dropY = e.clientY - rect.top;

    // Convert to timeline coordinates
    const dropTime = pixelsToTime(dropX, pixelsPerSecond);
    const trackIndex = getTrackIndexFromY(dropY);

    // Snap to existing clip edges
    const snapPoints = getClipSnapPoints(clips, pixelsPerSecond);
    const snappedX = snapToPoints(dropX, snapPoints);
    const snappedTime = pixelsToTime(snappedX, pixelsPerSecond);

    // Get media data to calculate width
    try {
      const dataTransferData = e.dataTransfer.getData('application/json');
      console.log('⏱️ [Timeline] DragOver - DataTransfer data:', dataTransferData);

      const mediaData = JSON.parse(dataTransferData);
      console.log('⏱️ [Timeline] DragOver - Parsed media data:', mediaData);

      if (mediaData && mediaData.duration) {
        // Update drop indicator
        setDropIndicator({
          x: snappedX,
          y: dropY,
          track: Math.max(0, trackIndex), // Default to track 0 if dropped in ruler
          time: snappedTime,
          width: mediaData.duration * pixelsPerSecond,
        });
        console.log('⏱️ [Timeline] DragOver - Drop indicator updated');
      } else {
        console.log('⏱️ [Timeline] DragOver - No valid media data or duration');
      }
    } catch (err) {
      console.log('⏱️ [Timeline] DragOver - Error parsing data:', err.message);
    }
  };

  // Handle drag enter
  const handleDragEnter = (e) => {
    console.log('⏱️ [Timeline] DragEnter event');
    e.preventDefault();
    setIsExternalDragActive(true);
  };

  // Handle drag leave
  const handleDragLeave = (e) => {
    console.log('⏱️ [Timeline] DragLeave event');
    e.preventDefault();
    setDropIndicator(null);
    setIsExternalDragActive(false);
  };

  // Handle drop
  const handleDrop = (e) => {
    console.log('⏱️ [Timeline] Drop event received!');
    e.preventDefault();
    e.stopPropagation();

    try {
      // Parse media data from dataTransfer
      const dataTransferData = e.dataTransfer.getData('application/json');
      console.log('⏱️ [Timeline] Drop - DataTransfer data:', dataTransferData);

      const mediaData = JSON.parse(dataTransferData);
      console.log('⏱️ [Timeline] Drop - Parsed media data:', mediaData);

      if (!mediaData || !mediaData.id || !mediaData.duration) {
        console.error('⏱️ [Timeline] Drop - Invalid media data:', mediaData);
        return;
      }

      // Calculate drop position
      const rect = containerRef.current.getBoundingClientRect();
      const dropX = e.clientX - rect.left + scrollX;
      const dropY = e.clientY - rect.top;

      // Convert to timeline coordinates
      const dropTime = pixelsToTime(dropX, pixelsPerSecond);
      const trackIndex = getTrackIndexFromY(dropY);

      // Snap to existing clip edges
      const snapPoints = getClipSnapPoints(clips, pixelsPerSecond);
      const snappedX = snapToPoints(dropX, snapPoints);
      const snappedTime = pixelsToTime(snappedX, pixelsPerSecond);

      // Constrain track index to valid range
      const validTrackIndex = Math.max(0, Math.min(trackIndex === -1 ? 0 : trackIndex, numTracks - 1));

      // Add clip to timeline store
      addClip({
        mediaId: mediaData.id,
        startTime: Math.max(0, snappedTime), // Ensure non-negative
        duration: mediaData.duration,
        track: validTrackIndex,
        metadata: mediaData, // Store full media metadata for thumbnail/filename display
      });

      console.log('⏱️ [Timeline] Drop - Clip added to timeline:', {
        mediaId: mediaData.id,
        startTime: Math.max(0, snappedTime),
        track: validTrackIndex,
      });
    } catch (err) {
      console.error('⏱️ [Timeline] Drop - Failed to handle drop:', err);
    } finally {
      // Clear drop indicator and drag state
      setDropIndicator(null);
      setIsExternalDragActive(false);
      console.log('⏱️ [Timeline] Drop - Completed');
    }
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
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Visual feedback for drag */}
      {isExternalDragActive && (
        <div
          className="absolute inset-0 z-40 bg-blue-500 bg-opacity-10 border-2 border-dashed border-blue-500"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-50 flex gap-2 bg-gray-800 rounded px-2 py-1">
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
      <div className="absolute top-2 left-2 z-50 bg-gray-800 rounded px-3 py-1" style={{ pointerEvents: 'none' }}>
        <span className="text-xs text-gray-400">
          Time: {currentTime.toFixed(2)}s
        </span>
      </div>

      {/* Konva Stage - disable pointer events during external drag */}
      <div style={{ pointerEvents: isExternalDragActive ? 'none' : 'auto' }}>
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          onWheel={handleWheel}
          onClick={handleStageClick}
          style={{
            cursor: isDragging ? 'grabbing' : 'default',
            position: 'relative',
            zIndex: 10
          }}
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
              onDragEnd={handleClipDragEnd}
              pixelsPerSecond={pixelsPerSecond}
              scrollX={scrollX}
              clips={clips}
              numTracks={numTracks}
            />
          ))}

          {/* Drop indicator - shows where clip will land */}
          {dropIndicator && (
            <Rect
              x={dropIndicator.x - scrollX}
              y={getTrackY(dropIndicator.track)}
              width={dropIndicator.width}
              height={TIMELINE_CONFIG.TRACK_HEIGHT}
              fill="rgba(59, 130, 246, 0.3)"
              stroke="#3b82f6"
              strokeWidth={2}
              dash={[5, 5]}
            />
          )}
        </Layer>

        {/* Time ruler layer */}
        <TimeRuler
          width={dimensions.width}
          scrollX={scrollX}
          pixelsPerSecond={pixelsPerSecond}
          onTimeClick={handlePlayheadTimeChange}
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
      </div>

      {/* Instructions */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-500 z-50" style={{ pointerEvents: 'none' }}>
        <p>Ctrl+Scroll: Zoom | Scroll: Pan | Click: Jump playhead | Drag red handle: Scrub</p>
      </div>
    </div>
  );
}

export default Timeline;
