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
  selectedClipId: null, // ID of currently selected clip
  selectedTextOverlayId: null, // ID of currently selected text overlay
  nextClipId: 1, // Counter for generating unique clip IDs
  nextTextOverlayId: 1, // Counter for generating unique text overlay IDs
  playheadTime: 0, // Current playhead position in seconds
  isPlaying: false, // Playback state
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

// Reducer
function timelineReducer(state, action) {
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
      };

      return {
        ...state,
        clips: [...state.clips, newClip],
        nextClipId: state.nextClipId + 1,
        selectedClipId: newClip.id, // Auto-select newly added clip
      };
    }

    case REMOVE_CLIP: {
      const clipId = action.payload;
      return {
        ...state,
        clips: state.clips.filter(clip => clip.id !== clipId),
        selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
      };
    }

    case UPDATE_CLIP: {
      const { clipId, updates } = action.payload;
      return {
        ...state,
        clips: state.clips.map(clip =>
          clip.id === clipId ? { ...clip, ...updates } : clip
        ),
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
      };

      return {
        ...state,
        textOverlays: [...state.textOverlays, newTextOverlay],
        nextTextOverlayId: state.nextTextOverlayId + 1,
        selectedTextOverlayId: newTextOverlay.id,
      };
    }

    case REMOVE_TEXT_OVERLAY: {
      const textOverlayId = action.payload;
      return {
        ...state,
        textOverlays: state.textOverlays.filter(overlay => overlay.id !== textOverlayId),
        selectedTextOverlayId: state.selectedTextOverlayId === textOverlayId ? null : state.selectedTextOverlayId,
      };
    }

    case UPDATE_TEXT_OVERLAY: {
      const { textOverlayId, updates } = action.payload;
      return {
        ...state,
        textOverlays: state.textOverlays.map(overlay =>
          overlay.id === textOverlayId ? { ...overlay, ...updates } : overlay
        ),
      };
    }

    case SELECT_TEXT_OVERLAY: {
      return {
        ...state,
        selectedTextOverlayId: action.payload,
        selectedClipId: null, // Deselect clips when selecting text overlay
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

  const value = {
    clips: state.clips,
    textOverlays: state.textOverlays,
    selectedClipId: state.selectedClipId,
    selectedTextOverlayId: state.selectedTextOverlayId,
    playheadTime: state.playheadTime,
    isPlaying: state.isPlaying,
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
