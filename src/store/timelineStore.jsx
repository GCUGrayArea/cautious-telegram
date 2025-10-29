import { createContext } from 'react';
import { useContext, useReducer, useCallback } from 'react';

/**
 * Timeline Store
 *
 * Manages timeline state including clips, selection, and timeline operations.
 * Uses Preact Context + useReducer for state management.
 */

// Initial state
const initialState = {
  clips: [], // Array of clip objects on the timeline
  textOverlays: [], // Array of text overlay objects
  transitions: [], // Array of transition objects between clips
  selectedClipId: null, // ID of currently selected clip
  selectedTextOverlayId: null, // ID of currently selected text overlay
  selectedTransitionId: null, // ID of currently selected transition
  nextClipId: 1, // Counter for generating unique clip IDs
  nextTextOverlayId: 1, // Counter for generating unique text overlay IDs
  nextTransitionId: 1, // Counter for generating unique transition IDs
  playheadTime: 0, // Current playhead position in seconds
  isPlaying: false, // Playback state
  // Undo/Redo stacks store snapshots of clips and textOverlays state
  undoStack: [], // Array of state snapshots for undo (max 50)
  redoStack: [], // Array of state snapshots for redo (max 50)
  // Clipboard for copy/cut/paste operations
  clipboardClip: null, // Cloned clip in clipboard
  clipboardOperation: null, // 'copy' or 'cut' or null
};

// Action types
const ADD_CLIP = 'ADD_CLIP';
const REMOVE_CLIP = 'REMOVE_CLIP';
const UPDATE_CLIP = 'UPDATE_CLIP';
const SELECT_CLIP = 'SELECT_CLIP';
const CLEAR_SELECTION = 'CLEAR_SELECTION';
const SET_PLAYHEAD_TIME = 'SET_PLAYHEAD_TIME';
const TOGGLE_PLAYBACK = 'TOGGLE_PLAYBACK';
const SET_PLAYBACK_STATE = 'SET_PLAYBACK_STATE';
const SPLIT_CLIP = 'SPLIT_CLIP';
const ADD_TEXT_OVERLAY = 'ADD_TEXT_OVERLAY';
const REMOVE_TEXT_OVERLAY = 'REMOVE_TEXT_OVERLAY';
const UPDATE_TEXT_OVERLAY = 'UPDATE_TEXT_OVERLAY';
const SELECT_TEXT_OVERLAY = 'SELECT_TEXT_OVERLAY';
const ADD_TRANSITION = 'ADD_TRANSITION';
const REMOVE_TRANSITION = 'REMOVE_TRANSITION';
const UPDATE_TRANSITION = 'UPDATE_TRANSITION';
const SELECT_TRANSITION = 'SELECT_TRANSITION';
const RESTORE_STATE = 'RESTORE_STATE';
const UNDO = 'UNDO';
const REDO = 'REDO';
const COPY_CLIP = 'COPY_CLIP';
const CUT_CLIP = 'CUT_CLIP';
const PASTE_CLIP = 'PASTE_CLIP';

// Helper: Create a snapshot of editable state (clips, overlays, and transitions)
function createStateSnapshot(state) {
  return {
    clips: state.clips.length > 0 ? structuredClone(state.clips) : [],
    textOverlays: state.textOverlays.length > 0 ? structuredClone(state.textOverlays) : [],
    transitions: state.transitions.length > 0 ? structuredClone(state.transitions) : [],
    nextClipId: state.nextClipId,
    nextTextOverlayId: state.nextTextOverlayId,
    nextTransitionId: state.nextTransitionId,
  };
}

// Helper: Add snapshot to undo stack, limit to 50 entries
function pushUndoStack(undoStack, snapshot) {
  const newStack = [...undoStack, snapshot];
  return newStack.slice(-50); // Keep only last 50 snapshots
}

// Reducer
function timelineReducer(state, action) {
  console.log('🔄 [Store] Reducer action:', action.type, 'payload:', action.payload, 'current state:', state);
  switch (action.type) {
    case ADD_CLIP: {
      const newClip = {
        id: state.nextClipId,
        mediaId: action.payload.mediaId,
        startTime: action.payload.startTime || 0,
        duration: action.payload.duration,
        track: action.payload.track || 0,
        inPoint: action.payload.inPoint || 0,
        outPoint: action.payload.outPoint || action.payload.duration,
        metadata: action.payload.metadata || {},
        // Audio properties for volume and fade control
        volume: action.payload.volume || 100, // 0-200, default 100%
        isMuted: action.payload.isMuted || false,
        fadeInDuration: action.payload.fadeInDuration || 0, // seconds
        fadeOutDuration: action.payload.fadeOutDuration || 0, // seconds
      };

      return {
        ...state,
        clips: [...state.clips, newClip],
        nextClipId: state.nextClipId + 1,
        selectedClipId: newClip.id, // Auto-select newly added clip
        undoStack: pushUndoStack(state.undoStack, createStateSnapshot(state)),
        redoStack: [], // Clear redo stack on new action
      };
    }

    case REMOVE_CLIP: {
      const clipId = action.payload;
      return {
        ...state,
        clips: state.clips.filter(clip => clip.id !== clipId),
        selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
        undoStack: pushUndoStack(state.undoStack, createStateSnapshot(state)),
        redoStack: [],
      };
    }

    case UPDATE_CLIP: {
      const { clipId, updates } = action.payload;
      return {
        ...state,
        clips: state.clips.map(clip =>
          clip.id === clipId ? { ...clip, ...updates } : clip
        ),
        undoStack: pushUndoStack(state.undoStack, createStateSnapshot(state)),
        redoStack: [],
      };
    }

    case SELECT_CLIP: {
      return {
        ...state,
        selectedClipId: action.payload,
        selectedTextOverlayId: null,
      };
    }

    case CLEAR_SELECTION: {
      return {
        ...state,
        selectedClipId: null,
        selectedTextOverlayId: null,
      };
    }

    case SET_PLAYHEAD_TIME: {
      return {
        ...state,
        playheadTime: action.payload,
      };
    }

    case TOGGLE_PLAYBACK: {
      return {
        ...state,
        isPlaying: !state.isPlaying,
      };
    }

    case SET_PLAYBACK_STATE: {
      return {
        ...state,
        isPlaying: action.payload,
      };
    }

    case SPLIT_CLIP: {
      const { clipId, firstClip, secondClip } = action.payload;

      // Remove original clip and add both new clips
      const clipsWithoutOriginal = state.clips.filter(clip => clip.id !== clipId);

      // Assign new IDs to both clips
      const firstClipWithId = { ...firstClip, id: state.nextClipId };
      const secondClipWithId = { ...secondClip, id: state.nextClipId + 1 };

      return {
        ...state,
        clips: [...clipsWithoutOriginal, firstClipWithId, secondClipWithId],
        nextClipId: state.nextClipId + 2,
        selectedClipId: secondClipWithId.id, // Select second clip after split
        undoStack: pushUndoStack(state.undoStack, createStateSnapshot(state)),
        redoStack: [],
      };
    }

    case ADD_TEXT_OVERLAY: {
      const newTextOverlay = {
        id: state.nextTextOverlayId,
        text: action.payload.text || 'New Text',
        startTime: action.payload.startTime || 0,
        duration: action.payload.duration || 5, // Default 5 seconds
        x: action.payload.x || 50, // Percentage of canvas width
        y: action.payload.y || 50, // Percentage of canvas height
        fontSize: action.payload.fontSize || 48,
        fontFamily: action.payload.fontFamily || 'Arial',
        color: action.payload.color || '#FFFFFF',
        animation: action.payload.animation || 'none', // none, fadeIn, fadeOut, slideInLeft, slideInRight, slideInTop, slideInBottom
        backgroundColor: action.payload.backgroundColor || '#000000', // Default to black for readability
        backgroundOpacity: action.payload.backgroundOpacity || 0, // Default to transparent (0)
      };

      return {
        ...state,
        textOverlays: [...state.textOverlays, newTextOverlay],
        nextTextOverlayId: state.nextTextOverlayId + 1,
        selectedTextOverlayId: newTextOverlay.id,
        undoStack: pushUndoStack(state.undoStack, createStateSnapshot(state)),
        redoStack: [],
      };
    }

    case REMOVE_TEXT_OVERLAY: {
      const textOverlayId = action.payload;
      return {
        ...state,
        textOverlays: state.textOverlays.filter(overlay => overlay.id !== textOverlayId),
        selectedTextOverlayId: state.selectedTextOverlayId === textOverlayId ? null : state.selectedTextOverlayId,
        undoStack: pushUndoStack(state.undoStack, createStateSnapshot(state)),
        redoStack: [],
      };
    }

    case UPDATE_TEXT_OVERLAY: {
      const { textOverlayId, updates } = action.payload;
      return {
        ...state,
        textOverlays: state.textOverlays.map(overlay =>
          overlay.id === textOverlayId ? { ...overlay, ...updates } : overlay
        ),
        undoStack: pushUndoStack(state.undoStack, createStateSnapshot(state)),
        redoStack: [],
      };
    }

    case SELECT_TEXT_OVERLAY: {
      const newState = {
        ...state,
        selectedTextOverlayId: action.payload,
        selectedClipId: null, // Deselect clips when selecting text overlay
      };
      console.log('🔄 [Store] SELECT_TEXT_OVERLAY returning:', newState);
      return newState;
    }

    case ADD_TRANSITION: {
      const newTransition = {
        id: state.nextTransitionId,
        clipIdBefore: action.payload.clipIdBefore,
        clipIdAfter: action.payload.clipIdAfter,
        type: action.payload.type || 'fade', // fade, crossfade, fadeToBlack, wipeLeft, wipeRight, dissolve
        duration: action.payload.duration || 1.0, // Default 1 second
      };

      return {
        ...state,
        transitions: [...state.transitions, newTransition],
        nextTransitionId: state.nextTransitionId + 1,
        selectedTransitionId: newTransition.id,
        undoStack: pushUndoStack(state.undoStack, createStateSnapshot(state)),
        redoStack: [],
      };
    }

    case REMOVE_TRANSITION: {
      const transitionId = action.payload;
      return {
        ...state,
        transitions: state.transitions.filter(transition => transition.id !== transitionId),
        selectedTransitionId: state.selectedTransitionId === transitionId ? null : state.selectedTransitionId,
        undoStack: pushUndoStack(state.undoStack, createStateSnapshot(state)),
        redoStack: [],
      };
    }

    case UPDATE_TRANSITION: {
      const { transitionId, updates } = action.payload;
      return {
        ...state,
        transitions: state.transitions.map(transition =>
          transition.id === transitionId ? { ...transition, ...updates } : transition
        ),
        undoStack: pushUndoStack(state.undoStack, createStateSnapshot(state)),
        redoStack: [],
      };
    }

    case SELECT_TRANSITION: {
      return {
        ...state,
        selectedTransitionId: action.payload,
        selectedClipId: null,
        selectedTextOverlayId: null,
      };
    }

    case RESTORE_STATE: {
      // Restore entire timeline state from saved data
      const { clips, textOverlays, transitions, playheadTime, nextClipId, nextTextOverlayId, nextTransitionId } = action.payload;
      const restoredState = {
        ...state,
        clips: clips || [],
        textOverlays: textOverlays || [],
        transitions: transitions || [],
        playheadTime: playheadTime || 0,
        nextClipId: nextClipId || 1,
        nextTextOverlayId: nextTextOverlayId || 1,
        nextTransitionId: nextTransitionId || 1,
        selectedClipId: null,
        selectedTextOverlayId: null,
        selectedTransitionId: null,
        isPlaying: false,
      };
      console.log('🔄 [Store] RESTORE_STATE - restored timeline with', restoredState.clips.length, 'clips,', restoredState.textOverlays.length, 'overlays, and', restoredState.transitions.length, 'transitions');
      return restoredState;
    }

    case UNDO: {
      // Pop from undo stack and push current state to redo stack
      if (state.undoStack.length === 0) {
        console.log('🔄 [Store] UNDO - nothing to undo');
        return state;
      }

      const newUndoStack = state.undoStack.slice(0, -1);
      const snapshotToRestore = state.undoStack[state.undoStack.length - 1];
      const currentSnapshot = createStateSnapshot(state);

      return {
        ...state,
        clips: snapshotToRestore.clips,
        textOverlays: snapshotToRestore.textOverlays,
        transitions: snapshotToRestore.transitions,
        nextClipId: snapshotToRestore.nextClipId,
        nextTextOverlayId: snapshotToRestore.nextTextOverlayId,
        nextTransitionId: snapshotToRestore.nextTransitionId,
        selectedClipId: null,
        selectedTextOverlayId: null,
        selectedTransitionId: null,
        undoStack: newUndoStack,
        redoStack: [...state.redoStack, currentSnapshot],
      };
    }

    case REDO: {
      // Pop from redo stack and push current state to undo stack
      if (state.redoStack.length === 0) {
        console.log('🔄 [Store] REDO - nothing to redo');
        return state;
      }

      const newRedoStack = state.redoStack.slice(0, -1);
      const snapshotToRestore = state.redoStack[state.redoStack.length - 1];
      const currentSnapshot = createStateSnapshot(state);

      return {
        ...state,
        clips: snapshotToRestore.clips,
        textOverlays: snapshotToRestore.textOverlays,
        transitions: snapshotToRestore.transitions,
        nextClipId: snapshotToRestore.nextClipId,
        nextTextOverlayId: snapshotToRestore.nextTextOverlayId,
        nextTransitionId: snapshotToRestore.nextTransitionId,
        selectedClipId: null,
        selectedTextOverlayId: null,
        selectedTransitionId: null,
        undoStack: [...state.undoStack, currentSnapshot],
        redoStack: newRedoStack,
      };
    }

    case COPY_CLIP: {
      // Copy selected clip to clipboard
      const clipToCopy = state.clips.find(clip => clip.id === action.payload);
      if (!clipToCopy) return state;

      return {
        ...state,
        clipboardClip: structuredClone(clipToCopy),
        clipboardOperation: 'copy',
      };
    }

    case CUT_CLIP: {
      // Cut selected clip (copy to clipboard and mark for deletion)
      const clipToCut = state.clips.find(clip => clip.id === action.payload);
      if (!clipToCut) return state;

      return {
        ...state,
        clipboardClip: structuredClone(clipToCut),
        clipboardOperation: 'cut',
        // Note: actual deletion happens when paste is performed or explicitly
      };
    }

    case PASTE_CLIP: {
      // Paste clipboard clip at playhead position
      if (!state.clipboardClip) return state;

      const newClipId = state.nextClipId;
      const newClip = {
        ...structuredClone(state.clipboardClip),
        id: newClipId,
        startTime: action.payload.playheadTime, // Paste at playhead
      };

      // If operation was cut, also remove the original clip
      let updatedClips = [...state.clips];
      if (state.clipboardOperation === 'cut') {
        updatedClips = updatedClips.filter(clip => clip.id !== state.clipboardClip.id);
      }

      return {
        ...state,
        clips: [...updatedClips, newClip],
        nextClipId: state.nextClipId + 1,
        selectedClipId: newClipId,
        undoStack: pushUndoStack(state.undoStack, createStateSnapshot(state)),
        redoStack: [],
        // Keep clipboard for potential re-paste (unless it was a cut)
        clipboardOperation: state.clipboardOperation === 'cut' ? null : state.clipboardOperation,
      };
    }

    default:
      return state;
  }
}

// Create context
const TimelineContext = createContext(null);

/**
 * Timeline Provider Component
 * Wraps the app to provide timeline state and actions
 */
export function TimelineProvider({ children }) {
  const [state, dispatch] = useReducer(timelineReducer, initialState);

  // Action creators
  const addClip = useCallback((clipData) => {
    dispatch({ type: ADD_CLIP, payload: clipData });
  }, []);

  const removeClip = useCallback((clipId) => {
    dispatch({ type: REMOVE_CLIP, payload: clipId });
  }, []);

  const updateClip = useCallback((clipId, updates) => {
    dispatch({ type: UPDATE_CLIP, payload: { clipId, updates } });
  }, []);

  const selectClip = useCallback((clipId) => {
    dispatch({ type: SELECT_CLIP, payload: clipId });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: CLEAR_SELECTION });
  }, []);

  const setPlayheadTime = useCallback((time) => {
    dispatch({ type: SET_PLAYHEAD_TIME, payload: time });
  }, []);

  const togglePlayback = useCallback(() => {
    dispatch({ type: TOGGLE_PLAYBACK });
  }, []);

  const setPlaybackState = useCallback((playing) => {
    dispatch({ type: SET_PLAYBACK_STATE, payload: playing });
  }, []);

  const splitClip = useCallback((clipId, firstClip, secondClip) => {
    dispatch({ type: SPLIT_CLIP, payload: { clipId, firstClip, secondClip } });
  }, []);

  const addTextOverlay = useCallback((textOverlayData) => {
    dispatch({ type: ADD_TEXT_OVERLAY, payload: textOverlayData });
  }, []);

  const removeTextOverlay = useCallback((textOverlayId) => {
    dispatch({ type: REMOVE_TEXT_OVERLAY, payload: textOverlayId });
  }, []);

  const updateTextOverlay = useCallback((textOverlayId, updates) => {
    dispatch({ type: UPDATE_TEXT_OVERLAY, payload: { textOverlayId, updates } });
  }, []);

  const selectTextOverlay = useCallback((textOverlayId) => {
    dispatch({ type: SELECT_TEXT_OVERLAY, payload: textOverlayId });
  }, []);

  const addTransition = useCallback((transitionData) => {
    dispatch({ type: ADD_TRANSITION, payload: transitionData });
  }, []);

  const removeTransition = useCallback((transitionId) => {
    dispatch({ type: REMOVE_TRANSITION, payload: transitionId });
  }, []);

  const updateTransition = useCallback((transitionId, updates) => {
    dispatch({ type: UPDATE_TRANSITION, payload: { transitionId, updates } });
  }, []);

  const selectTransition = useCallback((transitionId) => {
    dispatch({ type: SELECT_TRANSITION, payload: transitionId });
  }, []);

  const restoreState = useCallback((savedState) => {
    dispatch({ type: RESTORE_STATE, payload: savedState });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: UNDO });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: REDO });
  }, []);

  const copyClip = useCallback((clipId) => {
    dispatch({ type: COPY_CLIP, payload: clipId });
  }, []);

  const cutClip = useCallback((clipId) => {
    dispatch({ type: CUT_CLIP, payload: clipId });
  }, []);

  const pasteClip = useCallback((playheadTime) => {
    dispatch({ type: PASTE_CLIP, payload: { playheadTime } });
  }, []);

  const value = {
    clips: state.clips,
    textOverlays: state.textOverlays,
    transitions: state.transitions,
    selectedClipId: state.selectedClipId,
    selectedTextOverlayId: state.selectedTextOverlayId,
    selectedTransitionId: state.selectedTransitionId,
    playheadTime: state.playheadTime,
    isPlaying: state.isPlaying,
    nextClipId: state.nextClipId,
    nextTextOverlayId: state.nextTextOverlayId,
    nextTransitionId: state.nextTransitionId,
    addClip,
    removeClip,
    updateClip,
    selectClip,
    clearSelection,
    setPlayheadTime,
    togglePlayback,
    setPlaybackState,
    splitClip,
    addTextOverlay,
    removeTextOverlay,
    updateTextOverlay,
    selectTextOverlay,
    addTransition,
    removeTransition,
    updateTransition,
    selectTransition,
    restoreState,
    undo,
    redo,
    copyClip,
    cutClip,
    pasteClip,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
    hasClipboard: state.clipboardClip !== null,
    clipboardOperation: state.clipboardOperation,
  };

  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
}

/**
 * Hook to use timeline context
 * Must be used within a TimelineProvider
 */
export function useTimeline() {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error('useTimeline must be used within a TimelineProvider');
  }
  return context;
}
