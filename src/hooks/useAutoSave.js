import { useEffect, useRef, useState } from 'react';
import { saveProject, loadProject, getOrCreateDefaultProject } from '../utils/api';

const AUTO_SAVE_INTERVAL_MS = 30000; // 30 seconds

/**
 * Custom hook to handle auto-saving timeline state to the database
 *
 * Features:
 * - Auto-saves timeline state every 30 seconds
 * - Loads saved state on component mount
 * - Shows save status indicator
 * - Graceful error handling
 *
 * @param {Object} timelineState - Current timeline state to save
 * @param {Array} timelineState.clips - Array of clip objects
 * @param {Array} timelineState.textOverlays - Array of text overlay objects
 * @param {number} timelineState.playheadTime - Current playhead position
 * @param {Function} callback - Callback to restore loaded state (receives timelineData)
 * @returns {Object} - { saveStatus, lastSaveTime, projectId }
 */
export function useAutoSave(timelineState, callback) {
  const [projectId, setProjectId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const autoSaveTimeoutRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Initialize project and load saved state
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const initializeProject = async () => {
      try {
        setSaveStatus('loading');
        const id = await getOrCreateDefaultProject();
        setProjectId(id);

        // Load saved timeline state
        const savedTimelineJson = await loadProject(id);
        if (savedTimelineJson) {
          try {
            const savedTimeline = JSON.parse(savedTimelineJson);
            console.log('✅ [AutoSave] Loaded saved project state:', savedTimeline);

            // Call callback to restore the state
            if (callback) {
              callback(savedTimeline);
            }
          } catch (e) {
            console.warn('[AutoSave] Failed to parse saved timeline JSON:', e);
          }
        }
        setSaveStatus('idle');
      } catch (error) {
        console.error('[AutoSave] Failed to initialize project:', error);
        setSaveStatus('error');
      }
    };

    initializeProject();
  }, [callback]);

  // Auto-save timeline state
  useEffect(() => {
    if (!projectId) return;

    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearInterval(autoSaveTimeoutRef.current);
    }

    // Set up auto-save interval
    autoSaveTimeoutRef.current = setInterval(async () => {
      try {
        setSaveStatus('saving');

        const timelineData = {
          clips: timelineState.clips || [],
          textOverlays: timelineState.textOverlays || [],
          playheadTime: timelineState.playheadTime || 0,
          // Store metadata for future use
          nextClipId: timelineState.nextClipId || 1,
          nextTextOverlayId: timelineState.nextTextOverlayId || 1,
        };

        const timelineJson = JSON.stringify(timelineData);
        await saveProject(projectId, timelineJson);

        const now = new Date().toLocaleTimeString();
        setLastSaveTime(now);
        setSaveStatus('saved');

        console.log(`✅ [AutoSave] Project ${projectId} saved at ${now}`);

        // Clear the "saved" status after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('[AutoSave] Failed to save project:', error);
        setSaveStatus('error');
      }
    }, AUTO_SAVE_INTERVAL_MS);

    // Cleanup
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearInterval(autoSaveTimeoutRef.current);
      }
    };
  }, [projectId, timelineState]);

  return {
    projectId,
    saveStatus,
    lastSaveTime,
    autoSaveIntervalMs: AUTO_SAVE_INTERVAL_MS,
  };
}
