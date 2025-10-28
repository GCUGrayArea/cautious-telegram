import { useState } from 'react';
import MediaLibrary from './components/MediaLibrary';
import Timeline from './components/Timeline';
import PreviewPlayer from './components/PreviewPlayer';
import { TimelineProvider, useTimeline } from './store/timelineStore.jsx';
import { DragProvider } from './store/dragStore.jsx';

/**
 * AppContent - Inner component that has access to timeline store
 */
function AppContent() {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const { playheadTime } = useTimeline();

  const handleMediaSelect = (media) => {
    console.log('Selected media:', media);
    setSelectedMedia(media);
  };

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
          <Timeline />
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
