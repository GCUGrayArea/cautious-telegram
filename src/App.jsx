import { useState } from 'preact/hooks';
import MediaLibrary from './components/MediaLibrary';
import Timeline from './components/Timeline';
import { TimelineProvider } from './store/timelineStore.jsx';

function App() {
  const [selectedMedia, setSelectedMedia] = useState(null);

  const handleMediaSelect = (media) => {
    console.log('Selected media:', media);
    setSelectedMedia(media);
    // TODO: Add to timeline when drag-and-drop is implemented (PR-008)
  };

  return (
    <TimelineProvider>
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
          <div className="flex-1 flex items-center justify-center bg-black">
            {selectedMedia ? (
              <div className="text-center">
                <p className="text-gray-400 mb-2">Selected: {selectedMedia.filename}</p>
                <p className="text-sm text-gray-500">Timeline and preview coming soon (PR-006, PR-012)</p>
              </div>
            ) : (
              <p className="text-gray-500">Import videos to get started</p>
            )}
          </div>

          {/* Timeline Area */}
          <Timeline />
        </div>
      </div>
      </div>
    </TimelineProvider>
  );
}

export default App;
