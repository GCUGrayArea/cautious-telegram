import { useState } from 'preact/hooks';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">ClipForge</h1>
        <p className="text-xl mb-8">Desktop Video Editor</p>

        <div className="space-y-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <p className="mb-2">Hello World from Preact + Tauri!</p>
            <button
              onClick={() => setCount(count + 1)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              Count: {count}
            </button>
          </div>

          <div className="text-sm text-gray-400">
            <p>Tauri v1.x + Preact + Tailwind CSS</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
