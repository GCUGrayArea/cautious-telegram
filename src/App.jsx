import { useState, useEffect, useRef, useCallback } from 'react';
import MediaLibrary from './components/MediaLibrary';
import RecordingPanel from './components/RecordingPanel';
import Timeline from './components/Timeline';
import PreviewPlayer from './components/PreviewPlayer';
import PlaybackControls from './components/PlaybackControls';
import ExportDialog from './components/ExportDialog';
// import TextOverlayEditor from './components/TextOverlayEditor'; // DISABLED: Text overlay feature suspended - see .claude/PR-STRETCH-009-NOTES.md
import ClipPropertiesPanel from './components/ClipPropertiesPanel';
import { TimelineProvider, useTimeline } from './store/timelineStore.jsx';
import { DragProvider } from './store/dragStore.jsx';
import { PlaybackEngine, calculateTimelineDuration } from './utils/playback';
import { useAutoSave } from './hooks/useAutoSave';

/**
 * AppContent - Inner component that has access to timeline store
 */
function AppContent() {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [activeTab, setActiveTab] = useState('library'); // 'library' or 'record'
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const { playheadTime, clips, isPlaying, setPlayheadTime, setPlaybackState, selectedTextOverlayId, textOverlays, clearSelection, restoreState, nextClipId, nextTextOverlayId } = useTimeline();
  const playbackEngineRef = useRef(null);

  // Recording state - lifted from RecordingPanel to persist across tab switches
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingMode, setRecordingMode] = useState('screen');

  // Recording refs - persist across tab switches
  const screenMediaRecorderRef = useRef(null);
  const screenChunksRef = useRef([]);
  const screenStreamRef = useRef(null);
  const webcamRecorderRef = useRef(null);
  const webcamChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const handleMediaSelect = (media) => {
    console.log('Selected media:', media);
    setSelectedMedia(media);
  };

  const handleRecordingImported = (media) => {
    console.log('Recording imported:', media);
    // Switch to library tab to show the imported recording
    setActiveTab('library');
    // The MediaLibrary component will auto-refresh via its useEffect
  };

  // Setup auto-save - will save every 30 seconds
  // Passes restoreState function to hook so it can restore saved state when component mounts
  const { projectId, saveStatus, lastSaveTime, isLoading } = useAutoSave(
    {
      clips,
      textOverlays,
      playheadTime,
      nextClipId,
      nextTextOverlayId,
    },
    restoreState
  );

  const handleExportClick = () => {
    setExportDialogOpen(true);
  };

  const handleExportDialogClose = () => {
    setExportDialogOpen(false);
  };

  // Initialize playback engine
  useEffect(() => {
    playbackEngineRef.current = new PlaybackEngine({
      onTimeUpdate: (time) => {
        setPlayheadTime(time);
      },
      onPlaybackEnd: () => {
        setPlaybackState(false);
      },
    });

    // Cleanup on unmount (app close only)
    return () => {
      if (playbackEngineRef.current) {
        playbackEngineRef.current.destroy();
      }
      // Cleanup recording streams only on app close
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [setPlayheadTime, setPlaybackState]);

  // Handle playback state changes
  useEffect(() => {
    if (!playbackEngineRef.current) return;

    const engine = playbackEngineRef.current;
    const totalDuration = calculateTimelineDuration(clips);

    if (isPlaying) {
      // If at end of timeline, restart from beginning
      if (playheadTime >= totalDuration - 0.1) {
        setPlayheadTime(0);
        engine.start(0, totalDuration);
      } else {
        engine.start(playheadTime, totalDuration);
      }
    } else {
      engine.pause();
    }
  }, [isPlaying, clips, playheadTime, setPlayheadTime]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
        <div>
          <h1 className="text-2xl font-bold">ClipForge</h1>
          <p className="text-sm text-gray-400">Desktop Video Editor</p>
        </div>
        {/* Auto-save Status Indicator */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-sm text-yellow-400 flex items-center gap-1">
              <span className="animate-spin">⟳</span> Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-sm text-green-400 flex items-center gap-1">
              ✓ Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-red-400 flex items-center gap-1">
              ✕ Save failed
            </span>
          )}
          {lastSaveTime && saveStatus === 'idle' && (
            <span className="text-xs text-gray-500">
              Last saved: {lastSaveTime}
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Media Library / Recording */}
        <div className="w-96 border-r border-gray-700 flex flex-col">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('library')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'library'
                  ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-750'
              }`}
            >
              Media Library
            </button>
            <button
              onClick={() => setActiveTab('record')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'record'
                  ? 'bg-gray-700 text-white border-b-2 border-red-500'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-750'
              }`}
            >
              Record
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'library' ? (
              <MediaLibrary onMediaSelect={handleMediaSelect} />
            ) : (
              <RecordingPanel
                onRecordingImported={handleRecordingImported}
                isRecording={isRecording}
                setIsRecording={setIsRecording}
                recordingTime={recordingTime}
                setRecordingTime={setRecordingTime}
                recordingMode={recordingMode}
                setRecordingMode={setRecordingMode}
                screenMediaRecorderRef={screenMediaRecorderRef}
                screenChunksRef={screenChunksRef}
                screenStreamRef={screenStreamRef}
                webcamRecorderRef={webcamRecorderRef}
                webcamChunksRef={webcamChunksRef}
                timerIntervalRef={timerIntervalRef}
                startTimeRef={startTimeRef}
              />
            )}
          </div>
        </div>

        {/* Main Editor Area (Timeline + Preview) */}
        <div className="flex-1 flex flex-col" style={{ minHeight: 0, minWidth: 0 }}>
          {/* Preview Area */}
          <div className="flex-1 bg-black max-h-[75vh]">
            <PreviewPlayer currentTime={playheadTime} />
          </div>

          {/* Timeline Area */}
          <div className="flex flex-col min-h-[10vh] flex-shrink-0">
            <Timeline />
            <PlaybackControls onExportClick={handleExportClick} currentTime={playheadTime} />
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={exportDialogOpen}
        onClose={handleExportDialogClose}
      />

      {/* Clip Properties Panel (Audio Controls) */}
      <ClipPropertiesPanel />

      {/* Text Overlay Editor Panel - DISABLED */}
      {/* Feature suspended - see .claude/PR-STRETCH-009-NOTES.md for details */}
      {/* {selectedTextOverlayId !== null && textOverlays && (
        (() => {
          const selectedOverlay = textOverlays.find(o => o.id === selectedTextOverlayId);
          return selectedOverlay ? (
            <TextOverlayEditor
              textOverlay={selectedOverlay}
              onClose={clearSelection}
            />
          ) : null;
        })()
      )} */}
    </div>
  );
}

/**
 * App - Root component with providers
 */
function App() {
  return (
    <DragProvider>
      <TimelineProvider>
        <AppContent />
      </TimelineProvider>
    </DragProvider>
  );
}

export default App;
