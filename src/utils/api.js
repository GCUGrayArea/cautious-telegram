/**
 * Tauri API wrapper functions for invoking backend commands
 */
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import { convertFileSrc } from '@tauri-apps/api/tauri';

/**
 * Import a video file and extract metadata
 * @param {string} videoPath - Path to the video file
 * @param {number|null} durationOverride - Optional duration in seconds to use if FFprobe fails
 * @returns {Promise<{success: boolean, media: object|null, error: string|null}>}
 */
export async function importVideo(videoPath, durationOverride = null) {
  return await invoke('import_video', { videoPath, durationOverride });
}

/**
 * Get all media from the library
 * @returns {Promise<Array>} - Array of media objects
 */
export async function getMediaLibrary() {
  return await invoke('get_media_library');
}

/**
 * Delete a media item from the library
 * @param {number} mediaId - ID of the media to delete
 * @returns {Promise<boolean>}
 */
export async function deleteMediaItem(mediaId) {
  return await invoke('delete_media_item', { mediaId });
}

/**
 * Open file picker dialog to select video files
 * @returns {Promise<string|string[]|null>} - Selected file path(s) or null if canceled
 */
export async function selectVideoFile(multiple = false) {
  return await open({
    multiple,
    filters: [{
      name: 'Video',
      extensions: ['mp4', 'mov', 'webm', 'avi', 'mkv']
    }]
  });
}

/**
 * Convert a file path to a URL that can be used in the frontend
 * @param {string} filePath - File system path
 * @returns {string} - URL for the file
 */
export function getAssetUrl(filePath) {
  return convertFileSrc(filePath);
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export function formatFileSize(bytes) {
  if (!bytes) return 'Unknown';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format duration in HH:MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration
 */
export function formatDuration(seconds) {
  if (!seconds) return '00:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Save a recording blob to disk
 * @param {Blob} blob - The recording blob
 * @param {string} filename - The filename for the recording
 * @returns {Promise<string>} - Path to the saved file
 */
export async function saveRecording(blob, filename) {
  // Convert blob to array buffer
  const arrayBuffer = await blob.arrayBuffer();
  const blobData = Array.from(new Uint8Array(arrayBuffer));

  return await invoke('save_recording', { blobData, filename });
}

/**
 * Import a recording into the media library
 * @param {string} filePath - Path to the recording file
 * @param {number|null} durationOverride - Optional duration in seconds (from recording timer)
 * @returns {Promise<{success: boolean, media: object|null, error: string|null}>}
 */
export async function importRecording(filePath, durationOverride = null) {
  return await invoke('import_recording', { filePath, durationOverride });
}

/**
 * Export timeline to video file
 * @param {Array} clips - Array of clip data objects
 * @param {Array} transitions - Array of transition data objects
 * @param {Array} textOverlays - Array of text overlay data objects
 * @param {Object} settings - Export settings (resolution, output_path)
 * @returns {Promise<string>} - Path to exported file
 */
export async function exportTimeline(clips, transitions, textOverlays, settings) {
  return await invoke('export_timeline', { clips, transitions, text_overlays: textOverlays, settings });
}

/**
 * Get export progress
 * @returns {Promise<{percentage: number, current_operation: string, eta_seconds: number|null}>}
 */
export async function getExportProgress() {
  return await invoke('get_export_progress');
}

/**
 * Save project timeline state to database
 * @param {number} projectId - Project ID (usually 1 for default)
 * @param {string} timelineJson - JSON string of timeline data
 * @returns {Promise<boolean>} - Success status
 */
export async function saveProject(projectId, timelineJson) {
  return await invoke('save_project', { projectId, timelineJson });
}

/**
 * Load project timeline state from database
 * @param {number} projectId - Project ID (usually 1 for default)
 * @returns {Promise<string|null>} - Timeline JSON string or null if not found
 */
export async function loadProject(projectId) {
  return await invoke('load_project', { projectId });
}

/**
 * Create a new project
 * @param {string} name - Project name
 * @returns {Promise<number>} - New project ID
 */
export async function createProject(name) {
  return await invoke('create_project', { name });
}

/**
 * Get or create the default project
 * @returns {Promise<number>} - Project ID (always 1 for default)
 */
export async function getOrCreateDefaultProject() {
  return await invoke('get_or_create_default_project');
}
