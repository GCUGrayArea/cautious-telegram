import { useState, useEffect, useRef } from 'react';
import MediaLibrary from './components/MediaLibrary';
import Timeline from './components/Timeline';
import PreviewPlayer from './components/PreviewPlayer';
import PlaybackControls from './components/PlaybackControls';
import { TimelineProvider, useTimeline } from './store/timelineStore.jsx';
import { DragProvider } from './store/dragStore.jsx';
import { PlaybackEngine, calculateTimelineDuration } from './utils/playback';

/**
 * AppContent - Inner component that has access to timeline store
 */
function AppContent() {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const { playheadTime, clips, isPlaying, setPlayheadTime, setPlaybackState } = useTimeline();
  const playbackEngineRef = useRef(null);

  const handleMediaSelect = (media) => {
    console.log('Selected media:', media);
    setSelectedMedia(media);
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

    // Cleanup on unmount
    return () => {
      if (playbackEngineRef.current) {
        playbackEngineRef.current.destroy();
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
        <h1 className="text-2xl font-bold">ClipForge</h1>
        <p className="text-sm text-gray-400">Desktop Video Editor</p>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Media Library Sidebar */}
        <div className="w-96 border-r border-gray-700">
          <MediaLibrary onMediaSelect={handleMediaSelect} />
        </div>

        {/* Main Editor Area (Timeline + Preview) */}
        <div className="flex-1 flex flex-col">
          {/* Preview Area */}
          <div className="flex-1 bg-black">
            <PreviewPlayer currentTime={playheadTime} />
          </div>

          {/* Timeline Area */}
          <div className="flex flex-col">
            <Timeline />
            <PlaybackControls />
          </div>
        </div>
      </div>
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
