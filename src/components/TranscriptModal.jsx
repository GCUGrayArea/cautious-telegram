import { useState } from 'react';
import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';

/**
 * Transcript Modal Component
 *
 * Displays transcription result in a modal with options to:
 * - Copy transcript to clipboard
 * - Save transcript as .txt file locally
 */
function TranscriptModal({ transcript, onClose }) {
  const [copyStatus, setCopyStatus] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(null), 2000);
    } catch (err) {
      setCopyStatus('Failed to copy');
      setTimeout(() => setCopyStatus(null), 2000);
    }
  };

  const handleSaveToFile = async () => {
    try {
      setIsLoading(true);
      const filePath = await save({
        defaultPath: 'transcript.txt',
        filters: [{ name: 'Text', extensions: ['txt'] }],
      });

      if (filePath) {
        await writeTextFile(filePath, transcript);
        setSaveStatus('Saved successfully!');
        setTimeout(() => setSaveStatus(null), 2000);
      }
    } catch (err) {
      console.error('Error saving file:', err);
      setSaveStatus('Failed to save');
      setTimeout(() => setSaveStatus(null), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-96 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Transcript</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
            title="Close"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
            {transcript}
          </p>
        </div>

        {/* Footer with buttons */}
        <div className="px-6 py-4 border-t border-gray-700 flex gap-3 justify-end">
          {/* Status messages */}
          {copyStatus && (
            <span className="text-green-400 text-sm self-center">{copyStatus}</span>
          )}
          {saveStatus && (
            <span className={`text-sm self-center ${saveStatus.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
              {saveStatus}
            </span>
          )}

          {/* Copy button */}
          <button
            onClick={handleCopyToClipboard}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition text-sm font-medium"
            title="Copy transcript to clipboard"
          >
            Copy to Clipboard
          </button>

          {/* Save button */}
          <button
            onClick={handleSaveToFile}
            disabled={isLoading}
            className={`px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition text-sm font-medium ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Save transcript as .txt file"
          >
            {isLoading ? 'Saving...' : 'Save as .txt'}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition text-sm font-medium"
            title="Close"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TranscriptModal;
