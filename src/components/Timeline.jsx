import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Line } from 'react-konva';
import TimeRuler from './timeline/TimeRuler';
import Playhead from './timeline/Playhead';
import TimelineClip from './timeline/TimelineClip';
import TextOverlayClip from './timeline/TextOverlayClip';
import {
  TIMELINE_CONFIG,
  applyZoom,
  getTrackY,
  pixelsToTime,
  getTrackIndexFromY,
  getClipSnapPoints,
  snapToPoints,
  splitClipAtTime,
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
  const {
    clips,
    textOverlays,
    selectedClipId,
    selectedTextOverlayId,
    playheadTime,
    selectClip,
    clearSelection,
    addClip,
    updateClip,
    setPlayheadTime,
    removeClip,
    splitClip,
    selectTextOverlay,
    updateTextOverlay,
    removeTextOverlay,
  } = useTimeline();

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
    // Check if click was on a clip (clips have onClick handlers that set cancelBubble)
    const clickedOnClip = e.cancelBubble === true;

    if (!clickedOnClip) {
      // Clear clip selection when clicking anywhere except clips
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

  // Handle clip trim end - update clip in/out points and duration in store
  const handleClipTrimEnd = (clipId, updates) => {
    const clipBefore = clips.find(c => c.id === clipId);
    console.log('✂️ [Timeline] BEFORE trim - Clip state:', {
      id: clipBefore?.id,
      startTime: clipBefore?.startTime,
      duration: clipBefore?.duration,
      inPoint: clipBefore?.inPoint,
      outPoint: clipBefore?.outPoint,
    });
    console.log('✂️ [Timeline] Trim end for clip:', clipId, 'Updates:', updates);
    updateClip(clipId, updates);

    // Log after update (will show in next render, but useful for debugging)
    setTimeout(() => {
      const clipAfter = clips.find(c => c.id === clipId);
      console.log('✂️ [Timeline] AFTER trim - Clip state:', {
        id: clipAfter?.id,
        startTime: clipAfter?.startTime,
        duration: clipAfter?.duration,
        inPoint: clipAfter?.inPoint,
        outPoint: clipAfter?.outPoint,
      });
    }, 0);
  };

  // Handle clip split at playhead position
  const handleSplitClip = () => {
    // Only split if a clip is selected
    if (!selectedClipId) {
      console.log('✂️ [Timeline] No clip selected for split');
      return;
    }

    // Find the selected clip
    const selectedClip = clips.find(clip => clip.id === selectedClipId);
    if (!selectedClip) {
      console.log('✂️ [Timeline] Selected clip not found');
      return;
    }

    // Check if playhead intersects the selected clip
    const clipEnd = selectedClip.startTime + selectedClip.duration;
    if (playheadTime < selectedClip.startTime || playheadTime > clipEnd) {
      console.log('✂️ [Timeline] Playhead not within selected clip');
      return;
    }

    // Split the clip at playhead position
    const result = splitClipAtTime(selectedClip, playheadTime);
    if (!result) {
      console.log('✂️ [Timeline] Cannot split at clip edges');
      return;
    }

    const { firstClip, secondClip } = result;
    console.log('✂️ [Timeline] Splitting clip:', selectedClipId, 'at time:', playheadTime);
    console.log('✂️ [Timeline] First clip:', firstClip);
    console.log('✂️ [Timeline] Second clip:', secondClip);

    // Update the store
    splitClip(selectedClipId, firstClip, secondClip);
  };

  // Handle clip deletion
  const handleDeleteClip = () => {
    // Only delete if a clip is selected
    if (!selectedClipId) {
      console.log('🗑️ [Timeline] No clip selected for deletion');
      return;
    }

    console.log('🗑️ [Timeline] Deleting clip:', selectedClipId);
    removeClip(selectedClipId);
  };

  // Handle text overlay selection
  const handleTextOverlayClick = (textOverlayId) => {
    selectTextOverlay(textOverlayId);
  };

  // Handle text overlay drag end - update overlay position
  const handleTextOverlayDragEnd = (textOverlayId, newStartTime) => {
    updateTextOverlay(textOverlayId, { startTime: newStartTime });
  };

  // Handle text overlay trim end - update duration
  const handleTextOverlayTrimEnd = (textOverlayId, updates) => {
    updateTextOverlay(textOverlayId, updates);
  };

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle keyboard shortcuts if not typing in an input field
      const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

      // Playhead navigation: Arrow keys (frame-by-frame)
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !isTyping) {
        e.preventDefault();
        const FRAME_DURATION = 1 / 30; // Assume 30fps for frame-by-frame navigation
        const direction = e.key === 'ArrowLeft' ? -1 : 1;
        const newTime = Math.max(0, currentTime + (direction * FRAME_DURATION));
        setCurrentTime(newTime);
        setPlayheadTime(newTime);
      }
      // Playhead navigation: Home (jump to start)
      else if (e.key === 'Home' && !isTyping) {
        e.preventDefault();
        setCurrentTime(0);
        setPlayheadTime(0);
      }
      // Playhead navigation: End (jump to end of timeline)
      else if (e.key === 'End' && !isTyping) {
        e.preventDefault();
        // Calculate max time as the end of the last clip
        const maxTime = clips.reduce((max, clip) => {
          const clipEnd = clip.startTime + clip.duration;
          return Math.max(max, clipEnd);
        }, 0);
        setCurrentTime(maxTime);
        setPlayheadTime(maxTime);
      }
      // Split clip: S key or Ctrl+K
      else if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && !isTyping) {
        e.preventDefault();
        handleSplitClip();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        handleSplitClip();
      }
      // Delete clip: Delete or Backspace key
      else if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping) {
        e.preventDefault();
        handleDeleteClip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, clips, playheadTime, currentTime, splitClip, removeClip, setPlayheadTime]);

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
    console.log('⏱️ [Timeline] MouseUp - isDragging:', isExternalDragActive, 'draggedItem:', draggedItem);
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

    console.log('⏱️ [Timeline] MouseUp - Adding clip at time:', snappedTime, 'track:', validTrackIndex);

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
  };

  // Handle drag leave
  const handleDragLeave = (e) => {
    console.log('⏱️ [Timeline] DragLeave event');
    e.preventDefault();
    setDropIndicator(null);
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
      // Clear drop indicator
      setDropIndicator(null);
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

  // Calculate required timeline height dynamically based on config
  const timelineHeight = TIMELINE_CONFIG.RULER_HEIGHT + (TIMELINE_CONFIG.TRACK_HEIGHT * 3);

  return (
    <div
      ref={containerRef}
      className="timeline-container bg-gray-900 border-t border-gray-700 overflow-hidden"
      style={{ height: `${timelineHeight}px`, position: 'relative' }}
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
              onTrimEnd={handleClipTrimEnd}
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

        {/* Text overlays layer */}
        <Layer>
          {textOverlays.map(textOverlay => (
            <TextOverlayClip
              key={textOverlay.id}
              textOverlay={textOverlay}
              selected={textOverlay.id === selectedTextOverlayId}
              onClick={handleTextOverlayClick}
              onDragEnd={handleTextOverlayDragEnd}
              onTrimEnd={handleTextOverlayTrimEnd}
              pixelsPerSecond={pixelsPerSecond}
              scrollX={scrollX}
              clips={clips}
              numTracks={numTracks}
            />
          ))}
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
    </div>
  );
}

export default Timeline;
