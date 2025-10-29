import { useEffect, useRef, useState } from 'react';
import { saveProject, loadProject, getOrCreateDefaultProject } from '../utils/api';

const AUTO_SAVE_INTERVAL_MS = 30000; // 30 seconds

/**
 * Custom hook to handle auto-saving timeline state to the database
 *
 * Features:
 * - Loads saved state on component mount and restores via restoreState callback
 * - Auto-saves timeline state every 30 seconds
 * - Shows save status indicator
 * - Graceful error handling
 *
 * @param {Object} timelineState - Current timeline state to save
 * @param {Array} timelineState.clips - Array of clip objects
 * @param {Array} timelineState.textOverlays - Array of text overlay objects
 * @param {number} timelineState.playheadTime - Current playhead position
 * @param {number} timelineState.nextClipId - Next clip ID counter
 * @param {number} timelineState.nextTextOverlayId - Next text overlay ID counter
 * @param {Function} restoreStateCallback - Function to restore state (receives { clips, textOverlays, playheadTime, nextClipId, nextTextOverlayId })
 * @returns {Object} - { saveStatus, lastSaveTime, projectId, isLoading }
 */
export function useAutoSave(timelineState, restoreStateCallback) {
  const [projectId, setProjectId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('loading'); // loading, idle, saving, saved, error
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const autoSaveTimeoutRef = useRef(null);
  const isInitializedRef = useRef(false);
  const hasRestoredRef = useRef(false);

  // Initialize project and load saved state ONCE on mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const initializeProject = async () => {
      try {
        setSaveStatus('loading');
        const id = await getOrCreateDefaultProject();
        console.log(`✅ [AutoSave] Initialized project with ID: ${id}`);
        setProjectId(id);

        // Load saved timeline state
        const savedTimelineJson = await loadProject(id);
        if (savedTimelineJson && !hasRestoredRef.current) {
          try {
            const savedTimeline = JSON.parse(savedTimelineJson);
            console.log('✅ [AutoSave] Loaded saved project state:', savedTimeline);

            // Call the restoreState function to update Redux/Context state
            if (restoreStateCallback) {
              restoreStateCallback(savedTimeline);
              hasRestoredRef.current = true;
            }
          } catch (e) {
            console.warn('[AutoSave] Failed to parse saved timeline JSON:', e);
          }
        } else {
          console.log('[AutoSave] No saved state found or already restored');
        }

        setIsLoading(false);
        setSaveStatus('idle');
      } catch (error) {
        console.error('[AutoSave] Failed to initialize project:', error);
        setIsLoading(false);
        setSaveStatus('error');
      }
    };

    initializeProject();
  }, [restoreStateCallback]);

  // Auto-save timeline state periodically
  useEffect(() => {
    if (!projectId) return;

    // Clear any existing interval
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
    isLoading,
    autoSaveIntervalMs: AUTO_SAVE_INTERVAL_MS,
  };
}
