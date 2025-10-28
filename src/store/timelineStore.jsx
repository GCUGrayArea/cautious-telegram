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
  selectedClipId: null, // ID of currently selected clip
  nextClipId: 1, // Counter for generating unique clip IDs
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
      };
    }

    case CLEAR_SELECTION: {
      return {
        ...state,
        selectedClipId: null,
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

  const value = {
    clips: state.clips,
    selectedClipId: state.selectedClipId,
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
