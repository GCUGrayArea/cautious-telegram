import { useState, useEffect } from 'react';
import { useTimeline } from '../store/timelineStore';

/**
 * TextOverlayEditor Component
 *
 * UI panel for editing text overlay properties:
 * - Text content
 * - Font family and size
 * - Color
 * - Position (x, y as percentages)
 * - Animation type
 */
function TextOverlayEditor({ textOverlay, onClose }) {
  const { updateTextOverlay, removeTextOverlay } = useTimeline();

  const [text, setText] = useState(textOverlay.text);
  const [fontSize, setFontSize] = useState(textOverlay.fontSize);
  const [fontFamily, setFontFamily] = useState(textOverlay.fontFamily);
  const [color, setColor] = useState(textOverlay.color);
  const [positionX, setPositionX] = useState(textOverlay.x);
  const [positionY, setPositionY] = useState(textOverlay.y);
  const [animation, setAnimation] = useState(textOverlay.animation);

  // Handle text change
  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    updateTextOverlay(textOverlay.id, { text: newText });
  };

  // Handle font size change
  const handleFontSizeChange = (e) => {
    const newSize = parseInt(e.target.value);
    setFontSize(newSize);
    updateTextOverlay(textOverlay.id, { fontSize: newSize });
  };

  // Handle font family change
  const handleFontFamilyChange = (e) => {
    const newFamily = e.target.value;
    setFontFamily(newFamily);
    updateTextOverlay(textOverlay.id, { fontFamily: newFamily });
  };

  // Handle color change
  const handleColorChange = (e) => {
    const newColor = e.target.value;
    setColor(newColor);
    updateTextOverlay(textOverlay.id, { color: newColor });
  };

  // Handle position X change
  const handlePositionXChange = (e) => {
    const newX = parseFloat(e.target.value);
    setPositionX(newX);
    updateTextOverlay(textOverlay.id, { x: newX });
  };

  // Handle position Y change
  const handlePositionYChange = (e) => {
    const newY = parseFloat(e.target.value);
    setPositionY(newY);
    updateTextOverlay(textOverlay.id, { y: newY });
  };

  // Handle animation change
  const handleAnimationChange = (e) => {
    const newAnimation = e.target.value;
    setAnimation(newAnimation);
    updateTextOverlay(textOverlay.id, { animation: newAnimation });
  };

  // Handle delete
  const handleDelete = () => {
    if (confirm('Delete this text overlay?')) {
      removeTextOverlay(textOverlay.id);
      onClose();
    }
  };

  return (
    <div className="fixed right-0 top-16 bottom-0 w-80 bg-gray-900 border-l border-gray-700 p-4 overflow-y-auto shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Text Overlay</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-200 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Text Content */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-300 mb-2">Text Content</label>
        <textarea
          value={text}
          onChange={handleTextChange}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="3"
          placeholder="Enter text"
        />
      </div>

      {/* Font Size */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Font Size: {fontSize}px
        </label>
        <input
          type="range"
          min="12"
          max="120"
          value={fontSize}
          onChange={handleFontSizeChange}
          className="w-full accent-blue-500"
        />
      </div>

      {/* Font Family */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-300 mb-2">Font Family</label>
        <select
          value={fontFamily}
          onChange={handleFontFamilyChange}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
          <option value="Comic Sans MS">Comic Sans MS</option>
          <option value="Impact">Impact</option>
        </select>
      </div>

      {/* Color */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-300 mb-2">Color</label>
        <div className="flex gap-3">
          <input
            type="color"
            value={color}
            onChange={handleColorChange}
            className="w-16 h-10 rounded cursor-pointer border border-gray-700"
          />
          <input
            type="text"
            value={color}
            onChange={handleColorChange}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="#FFFFFF"
          />
        </div>
      </div>

      {/* Position X */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Position X: {positionX.toFixed(1)}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={positionX}
          onChange={handlePositionXChange}
          className="w-full accent-blue-500"
        />
      </div>

      {/* Position Y */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Position Y: {positionY.toFixed(1)}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={positionY}
          onChange={handlePositionYChange}
          className="w-full accent-blue-500"
        />
      </div>

      {/* Animation */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-300 mb-2">Animation</label>
        <select
          value={animation}
          onChange={handleAnimationChange}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="none">None</option>
          <option value="fadeIn">Fade In</option>
          <option value="fadeOut">Fade Out</option>
          <option value="slideInLeft">Slide In (Left)</option>
          <option value="slideInRight">Slide In (Right)</option>
          <option value="slideInTop">Slide In (Top)</option>
          <option value="slideInBottom">Slide In (Bottom)</option>
        </select>
      </div>

      {/* Delete Button */}
      <button
        onClick={handleDelete}
        className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition-colors"
      >
        Delete Text Overlay
      </button>
    </div>
  );
}

export default TextOverlayEditor;
