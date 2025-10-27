# Task List for ClipForge Desktop Video Editor

## Block 1: Foundation and Configuration (No dependencies)

### PR-001: Project Setup and Tauri Configuration
**Status:** New
**Dependencies:** None
**Priority:** High

**Description:**
Initialize Tauri project with Preact frontend, configure build system, set up development environment, and establish project structure. This PR creates the foundation for all subsequent work.

**Files (ESTIMATED - will be refined during Planning):**
- src-tauri/Cargo.toml (create) - Tauri backend dependencies
- src-tauri/src/main.rs (create) - Tauri entry point and window configuration
- src-tauri/tauri.conf.json (create) - Tauri app configuration
- package.json (create) - Frontend dependencies (Preact, Vite, Konva)
- vite.config.js (create) - Vite build configuration
- src/main.jsx (create) - Preact app entry point
- src/App.jsx (create) - Root component skeleton
- .gitignore (modify) - Add build artifacts and dependencies
- README.md (create) - Setup instructions and architecture overview

**Acceptance Criteria:**
- [ ] Tauri app launches with "Hello World" Preact UI
- [ ] Development environment runs with hot reload
- [ ] Project builds successfully for target platform (macOS or Windows)
- [ ] Packaged app can be generated (tauri build)
- [ ] README includes setup instructions
- [ ] All dependencies install without errors

**Notes:**
This PR establishes the technical foundation. Ensure Rust toolchain and Node.js are properly configured.

---

### PR-002: SQLite Database Setup and Schema
**Status:** New
**Dependencies:** None
**Priority:** High

**Description:**
Set up SQLite database integration in Tauri backend, define schema for media library and projects, create database initialization and migration logic.

**Files (ESTIMATED - will be refined during Planning):**
- src-tauri/Cargo.toml (modify) - Add rusqlite or sqlx dependency
- src-tauri/src/database.rs (create) - Database connection and initialization
- src-tauri/src/schema.sql (create) - SQL schema definitions
- src-tauri/src/models/media.rs (create) - Media model structs
- src-tauri/src/models/project.rs (create) - Project model structs
- src-tauri/src/main.rs (modify) - Initialize database on app start

**Acceptance Criteria:**
- [ ] SQLite database file created on first app launch
- [ ] Tables created: media (id, path, duration, resolution, size, thumbnail_path, created_at)
- [ ] Tables created: projects (id, name, timeline_json, created_at, updated_at)
- [ ] Database connection pooling works correctly
- [ ] Basic CRUD operations functional
- [ ] Database file stored in appropriate app data directory

**Notes:**
Use platform-appropriate data directory (AppData on Windows, Application Support on macOS).

---

### PR-003: FFmpeg Integration Setup
**Status:** New
**Dependencies:** None
**Priority:** High

**Description:**
Integrate FFmpeg into Tauri application for video processing. Download/bundle FFmpeg binaries, create Rust wrapper for FFmpeg commands, test basic operations (probe, thumbnail generation).

**Files (ESTIMATED - will be refined during Planning):**
- src-tauri/Cargo.toml (modify) - Add FFmpeg-related dependencies
- src-tauri/src/ffmpeg.rs (create) - FFmpeg wrapper functions
- src-tauri/build.rs (create) - Build script to bundle FFmpeg binaries
- src-tauri/ffmpeg/ (create directory) - FFmpeg binaries for each platform
- src-tauri/src/main.rs (modify) - Register FFmpeg commands

**Acceptance Criteria:**
- [ ] FFmpeg binary bundled with app or downloaded on first run
- [ ] Rust wrapper can execute FFmpeg commands
- [ ] Can probe video file for metadata (duration, resolution, codec)
- [ ] Can generate thumbnail from video file
- [ ] FFmpeg output/errors captured and logged
- [ ] Cross-platform compatibility (macOS and Windows)

**Notes:**
Consider using static FFmpeg builds. Binaries are large (~50-100MB), plan for download or bundling strategy.

---

## Block 2: Core Media Import (Depends on: Block 1)

### PR-004: Video File Import and Metadata Extraction
**Status:** New
**Dependencies:** PR-001, PR-002, PR-003
**Priority:** High

**Description:**
Implement video file import via drag-and-drop and file picker. Extract metadata using FFmpeg, generate thumbnails, save to SQLite database, and display in media library UI.

**Files (ESTIMATED - will be refined during Planning):**
- src-tauri/src/commands/import.rs (create) - Import command implementation
- src-tauri/src/main.rs (modify) - Register import command
- src/components/MediaLibrary.jsx (create) - Media library UI component
- src/utils/api.js (create) - Tauri invoke wrappers
- src/App.jsx (modify) - Add MediaLibrary component
- src/styles/MediaLibrary.css (create) - Media library styles

**Acceptance Criteria:**
- [ ] User can click "Import" button to open file picker
- [ ] User can drag and drop video files onto app window
- [ ] Supported formats validated: MP4, MOV, WebM
- [ ] FFmpeg extracts duration, resolution, file size, codec, FPS
- [ ] Thumbnail generated and saved for each imported video
- [ ] Media saved to SQLite database
- [ ] Media library UI displays imported clips with thumbnails and metadata
- [ ] Multiple files can be imported simultaneously

**Notes:**
File validation is critical—handle corrupted files gracefully with error messages.

---

### PR-005: Media Library Management UI
**Status:** New
**Dependencies:** PR-004
**Priority:** Medium

**Description:**
Enhance media library with grid/list view toggle, search/filter, delete functionality, and detailed metadata display. Improve UX with hover states and selection.

**Files (ESTIMATED - will be refined during Planning):**
- src/components/MediaLibrary.jsx (modify) - Add grid/list toggle, search, delete
- src/components/MediaCard.jsx (create) - Individual media item component
- src-tauri/src/commands/media.rs (create) - Delete media command
- src-tauri/src/main.rs (modify) - Register media commands
- src/styles/MediaLibrary.css (modify) - Enhanced styles

**Acceptance Criteria:**
- [ ] Toggle between grid and list view
- [ ] Search/filter media by filename
- [ ] Click media card to view detailed metadata
- [ ] Delete media from library (removes from DB, keeps file)
- [ ] Hover states and visual feedback
- [ ] Empty state when no media imported

**Notes:**
Consider lazy loading thumbnails if media library becomes large.

---

## Block 3: Timeline Foundation (Depends on: Block 2)

### PR-006: Konva Timeline Canvas Setup
**Status:** New
**Dependencies:** PR-001, PR-004
**Priority:** High

**Description:**
Set up Konva.js canvas for timeline editor. Create timeline component with time ruler, playhead, and basic rendering infrastructure. Establish coordinate system and zoom/pan controls.

**Files (ESTIMATED - will be refined during Planning):**
- src/components/Timeline.jsx (create) - Timeline component with Konva Stage
- src/components/timeline/TimeRuler.jsx (create) - Time ruler with timestamps
- src/components/timeline/Playhead.jsx (create) - Playhead indicator
- src/utils/timeline.js (create) - Timeline utility functions (time conversion, snap)
- src/App.jsx (modify) - Add Timeline component
- src/styles/Timeline.css (create) - Timeline container styles
- package.json (modify) - Add react-konva dependency

**Acceptance Criteria:**
- [ ] Konva Stage renders timeline canvas
- [ ] Time ruler displays timestamps (00:00, 00:01, 00:02...)
- [ ] Playhead visible and positioned correctly
- [ ] Zoom in/out controls functional (Ctrl+scroll or buttons)
- [ ] Pan/scroll horizontally through timeline
- [ ] Timeline scaled correctly (1 second = X pixels)
- [ ] Multi-track layout visible (at least 2 tracks)

**Notes:**
Establish coordinate system early—time-to-pixel conversion is critical for all timeline operations.

---

### PR-007: Timeline Clip Rendering
**Status:** New
**Dependencies:** PR-006
**Priority:** High

**Description:**
Render video clips on timeline as Konva rectangles. Display clip thumbnails, duration, and visual boundaries. Implement clip selection (click to select).

**Files (ESTIMATED - will be refined during Planning):**
- src/components/timeline/TimelineClip.jsx (create) - Konva clip rectangle
- src/components/Timeline.jsx (modify) - Render clips from state
- src/utils/timeline.js (modify) - Clip positioning functions
- src/store/timelineStore.js (create) - Timeline state management
- src/styles/Timeline.css (modify) - Clip styles

**Acceptance Criteria:**
- [ ] Clips rendered as rectangles on timeline
- [ ] Clip width proportional to duration
- [ ] Clip shows thumbnail and filename
- [ ] Click clip to select (highlight border)
- [ ] Selected clip visually distinguished
- [ ] Clips positioned correctly on tracks

**Notes:**
Use Konva Image node for thumbnails. Consider caching thumbnail images for performance.

---

### PR-008: Drag Clips from Media Library to Timeline
**Status:** New
**Dependencies:** PR-007
**Priority:** High

**Description:**
Implement drag-and-drop from media library to timeline. Calculate drop position, add clip to timeline state, render on appropriate track.

**Files (ESTIMATED - will be refined during Planning):**
- src/components/MediaLibrary.jsx (modify) - Make clips draggable
- src/components/Timeline.jsx (modify) - Accept drops, calculate position
- src/store/timelineStore.js (modify) - Add clip to timeline state
- src/utils/timeline.js (modify) - Drop position calculation, snap logic

**Acceptance Criteria:**
- [ ] User can drag clip from media library
- [ ] Drop indicator shows where clip will land on timeline
- [ ] Clip added to timeline at correct position and track
- [ ] Timeline state updated with new clip
- [ ] Clip rendered immediately after drop
- [ ] Snap-to-grid or snap-to-edge works

**Notes:**
Implement snap-to-edge early—makes editing much more intuitive.

---

## Block 4: Timeline Editing Operations (Depends on: Block 3)

### PR-009: Timeline Clip Dragging and Repositioning
**Status:** New
**Dependencies:** PR-008
**Priority:** High

**Description:**
Enable dragging clips within timeline to reposition them. Support moving between tracks, snap to adjacent clips, update timeline state on drag end.

**Files (ESTIMATED - will be refined during Planning):**
- src/components/timeline/TimelineClip.jsx (modify) - Enable Konva dragging
- src/components/Timeline.jsx (modify) - Handle drag events, update state
- src/utils/timeline.js (modify) - Drag constraints, snap logic
- src/store/timelineStore.js (modify) - Update clip position in state

**Acceptance Criteria:**
- [ ] User can drag clips horizontally on timeline
- [ ] Clips snap to adjacent clip edges
- [ ] Clips can move between tracks
- [ ] Drag position updates in real-time
- [ ] State updated on drag end
- [ ] Clips cannot overlap (or handle overlaps appropriately)

**Notes:**
Consider collision detection—should clips push others, or overlap?

---

### PR-010: Timeline Clip Trimming
**Status:** New
**Dependencies:** PR-009
**Priority:** High

**Description:**
Implement clip trimming by dragging clip edges. Adjust in-point and out-point, update clip duration on timeline, visual feedback during trim.

**Files (ESTIMATED - will be refined during Planning):**
- src/components/timeline/TimelineClip.jsx (modify) - Edge resize handles
- src/components/Timeline.jsx (modify) - Handle trim events
- src/store/timelineStore.js (modify) - Update clip trim points
- src/utils/timeline.js (modify) - Trim calculation logic

**Acceptance Criteria:**
- [ ] User can drag left edge to adjust clip start (in-point)
- [ ] User can drag right edge to adjust clip end (out-point)
- [ ] Trim constrained to source clip duration
- [ ] Visual feedback during trim (cursor change, preview)
- [ ] Timeline state updated with new in/out points
- [ ] Clip width updates to reflect trim

**Notes:**
Trim should not affect source file—only in/out points for export.

---

### PR-011: Timeline Clip Split and Delete
**Status:** New
**Dependencies:** PR-009
**Priority:** High

**Description:**
Implement clip split at playhead position and clip deletion. Update timeline state, re-render affected clips.

**Files (ESTIMATED - will be refined during Planning):**
- src/components/Timeline.jsx (modify) - Split and delete actions
- src/store/timelineStore.js (modify) - Split/delete state mutations
- src/utils/timeline.js (modify) - Split calculation logic
- src/components/TimelineControls.jsx (create) - Split/delete buttons

**Acceptance Criteria:**
- [ ] User can split clip at playhead position (button or keyboard shortcut)
- [ ] Split creates two clips with correct in/out points
- [ ] User can delete selected clip (Del/Backspace key or button)
- [ ] Subsequent clips shift left after delete (or remain in place)
- [ ] Timeline state updated correctly
- [ ] Split/delete actions undoable (future enhancement)

**Notes:**
Split should maintain continuity—second clip starts where first ends.

---

## Block 5: Video Preview and Playback (Depends on: Block 3)

### PR-012: Video Preview Player Component
**Status:** New
**Dependencies:** PR-007
**Priority:** High

**Description:**
Create video preview player using HTML5 video element. Display frame at playhead position, handle clip boundaries, load correct source file.

**Files (ESTIMATED - will be refined during Planning):**
- src/components/PreviewPlayer.jsx (create) - Video player component
- src/utils/preview.js (create) - Calculate current clip and time offset
- src/App.jsx (modify) - Add PreviewPlayer component
- src/store/timelineStore.js (modify) - Track playhead position
- src/styles/PreviewPlayer.css (create) - Player styles

**Acceptance Criteria:**
- [ ] Video element displays frame at playhead position
- [ ] Player loads correct source file for current clip
- [ ] Player updates when playhead moves (scrubbing)
- [ ] Handles clip boundaries (switches source when playhead crosses clips)
- [ ] No playback yet (just frame display)

**Notes:**
Calculate which clip(s) visible at playhead, seek video element to correct time within clip.

---

### PR-013: Timeline Playback Controls
**Status:** New
**Dependencies:** PR-012
**Priority:** High

**Description:**
Implement play/pause controls, real-time playback, playhead animation during playback, synchronized audio.

**Files (ESTIMATED - will be refined during Planning):**
- src/components/PreviewPlayer.jsx (modify) - Play/pause functionality
- src/components/Timeline.jsx (modify) - Animate playhead during playback
- src/components/PlaybackControls.jsx (create) - Play/pause/stop buttons
- src/utils/playback.js (create) - Playback timing and synchronization
- src/store/timelineStore.js (modify) - Playback state (playing, paused)

**Acceptance Criteria:**
- [ ] Play button starts playback, pause button pauses
- [ ] Playhead animates smoothly during playback
- [ ] Video plays synchronized with playhead position
- [ ] Audio plays synchronized with video
- [ ] Playback stops at end of timeline
- [ ] Spacebar toggles play/pause
- [ ] Frame rate at 30+ fps

**Notes:**
Use requestAnimationFrame for smooth playhead animation. Synchronize video.currentTime with playhead.

---

### PR-014: Timeline Scrubbing and Navigation
**Status:** New
**Dependencies:** PR-013
**Priority:** Medium

**Description:**
Implement playhead scrubbing (drag to any position), click timeline to jump, keyboard navigation (arrow keys for frame-by-frame, Home/End for start/end).

**Files (ESTIMATED - will be refined during Planning):**
- src/components/timeline/Playhead.jsx (modify) - Draggable playhead
- src/components/Timeline.jsx (modify) - Click to jump, keyboard handlers
- src/utils/playback.js (modify) - Scrubbing logic
- src/store/timelineStore.js (modify) - Update playhead position

**Acceptance Criteria:**
- [ ] User can drag playhead to any position on timeline
- [ ] Click timeline ruler to jump playhead to that time
- [ ] Arrow keys move playhead frame-by-frame
- [ ] Home key jumps to timeline start, End key to end
- [ ] Preview updates immediately during scrubbing
- [ ] Scrubbing is smooth and responsive

**Notes:**
Frame-by-frame navigation: calculate frame duration (1/fps), move playhead by that increment.

---

## Block 6: Screen and Webcam Recording (Depends on: Block 1)

### PR-015: Screen Recording Implementation (Tauri Backend)
**Status:** New
**Dependencies:** PR-001, PR-003
**Priority:** High

**Description:**
Implement screen recording using platform-specific APIs (AVFoundation on macOS, WGC on Windows). Provide Tauri commands to list screens/windows, start recording, stop recording, save file.

**Files (ESTIMATED - will be refined during Planning):**
- src-tauri/src/recording/screen_capture.rs (create) - Screen recording logic
- src-tauri/src/commands/recording.rs (create) - Recording commands
- src-tauri/Cargo.toml (modify) - Add platform-specific dependencies
- src-tauri/src/main.rs (modify) - Register recording commands

**Acceptance Criteria:**
- [ ] Tauri command lists available screens/windows
- [ ] Start recording captures screen at selected resolution
- [ ] Stop recording saves video file (MP4 or WebM)
- [ ] Audio capture from microphone works
- [ ] Recording file saved to temp directory or user-specified location
- [ ] Works on at least one platform (macOS or Windows)

**Notes:**
Fallback to getDisplayMedia() if native APIs too complex. Focus on getting it working first.

---

### PR-016: Screen Recording UI and Controls
**Status:** New
**Dependencies:** PR-015, PR-004
**Priority:** High

**Description:**
Create UI for screen recording: source selection (screens/windows), start/stop buttons, recording timer, preview. Automatically import recording to media library on stop.

**Files (ESTIMATED - will be refined during Planning):**
- src/components/RecordingPanel.jsx (create) - Recording UI component
- src/components/ScreenRecorder.jsx (create) - Screen recording controls
- src/utils/api.js (modify) - Recording command wrappers
- src/App.jsx (modify) - Add RecordingPanel component
- src/styles/RecordingPanel.css (create) - Recording UI styles

**Acceptance Criteria:**
- [ ] User can select screen/window from dropdown
- [ ] Start button initiates recording
- [ ] Recording timer shows elapsed time
- [ ] Stop button ends recording
- [ ] Recording automatically imported to media library
- [ ] Visual feedback during recording (red indicator)
- [ ] Recording appears on timeline or media library

**Notes:**
Auto-import makes workflow seamless—user records and immediately edits.

---

### PR-017: Webcam Recording Implementation
**Status:** New
**Dependencies:** PR-015
**Priority:** Medium

**Description:**
Implement webcam recording using getUserMedia() web API. Capture video/audio from camera, save recording, import to media library.

**Files (ESTIMATED - will be refined during Planning):**
- src/components/WebcamRecorder.jsx (create) - Webcam recording component
- src/utils/recording.js (create) - MediaRecorder wrapper
- src-tauri/src/commands/recording.rs (modify) - Save webcam recording
- src/components/RecordingPanel.jsx (modify) - Add webcam tab/option

**Acceptance Criteria:**
- [ ] User can select webcam from available cameras
- [ ] Preview webcam feed before recording
- [ ] Start/stop recording with visual feedback
- [ ] Recording saved as MP4 or WebM
- [ ] Audio captured from camera/microphone
- [ ] Recording imported to media library
- [ ] Works on both macOS and Windows

**Notes:**
getUserMedia() is cross-platform and simpler than native APIs for webcam.

---

### PR-018: Simultaneous Screen + Webcam Recording
**Status:** New
**Dependencies:** PR-016, PR-017
**Priority:** Medium

**Description:**
Enable simultaneous screen and webcam recording. Capture both streams, save as separate clips or composite (PiP). Add clips to separate timeline tracks.

**Files (ESTIMATED - will be refined during Planning):**
- src/components/RecordingPanel.jsx (modify) - Simultaneous recording option
- src/utils/recording.js (modify) - Multi-stream recording logic
- src-tauri/src/commands/recording.rs (modify) - Handle multiple streams

**Acceptance Criteria:**
- [ ] User can enable "Screen + Webcam" mode
- [ ] Both streams recorded simultaneously
- [ ] Streams synchronized (same start time)
- [ ] Saved as two separate files or composite
- [ ] Both clips added to timeline on separate tracks
- [ ] Webcam positioned as overlay (PiP) if composite

**Notes:**
Consider saving as separate clips for more editing flexibility.

---

## Block 7: Video Export (Depends on: Block 4, Block 5)

### PR-019: FFmpeg Export Pipeline
**Status:** New
**Dependencies:** PR-003, PR-010, PR-013
**Priority:** High

**Description:**
Implement video export using FFmpeg. Stitch clips in timeline order, apply trim points, encode to MP4, handle export settings (resolution, bitrate).

**Files (ESTIMATED - will be refined during Planning):**
- src-tauri/src/export/encoder.rs (create) - FFmpeg export logic
- src-tauri/src/commands/export.rs (create) - Export command
- src-tauri/src/ffmpeg.rs (modify) - FFmpeg complex filter generation
- src-tauri/src/main.rs (modify) - Register export command

**Acceptance Criteria:**
- [ ] Concatenate clips in timeline order
- [ ] Apply trim points (in/out) correctly
- [ ] Encode to H.264 MP4 with AAC audio
- [ ] Support resolution options (source, 720p, 1080p)
- [ ] Export completes without errors for simple timeline
- [ ] Output file playable in standard video players

**Notes:**
FFmpeg complex filters needed for overlays/PiP. Start with simple concatenation for MVP.

---

### PR-020: Export Dialog and Progress Indicator
**Status:** New
**Dependencies:** PR-019
**Priority:** High

**Description:**
Create export dialog UI with resolution/quality settings, file save picker, progress bar, cancel option. Poll export progress from backend.

**Files (ESTIMATED - will be refined during Planning):**
- src/components/ExportDialog.jsx (create) - Export dialog component
- src/components/ExportProgress.jsx (create) - Progress bar component
- src/utils/api.js (modify) - Export command wrappers
- src/App.jsx (modify) - Export dialog trigger
- src/styles/ExportDialog.css (create) - Dialog styles
- src-tauri/src/commands/export.rs (modify) - Progress reporting

**Acceptance Criteria:**
- [ ] User clicks "Export" button to open dialog
- [ ] Dialog shows resolution options (720p, 1080p, source)
- [ ] Dialog shows quality/bitrate options
- [ ] File save picker lets user choose output location
- [ ] Progress bar shows export percentage
- [ ] Estimated time remaining displayed
- [ ] User can cancel export mid-process
- [ ] Notification on export completion

**Notes:**
Poll export progress every 100-500ms for smooth progress bar updates.

---

### PR-021: Multi-Track Timeline Export (Overlays/PiP)
**Status:** New
**Dependencies:** PR-019, PR-018
**Priority:** Medium

**Description:**
Extend export to handle multiple timeline tracks. Render overlays (PiP) on top of main video track using FFmpeg overlay filter.

**Files (ESTIMATED - will be refined during Planning):**
- src-tauri/src/export/encoder.rs (modify) - Multi-track FFmpeg filter
- src-tauri/src/commands/export.rs (modify) - Handle multi-track timelines
- src-tauri/src/ffmpeg.rs (modify) - Overlay filter generation

**Acceptance Criteria:**
- [ ] Export timelines with 2+ tracks
- [ ] Overlay clips rendered on top of base video
- [ ] Overlay position and size correct (PiP corner positioning)
- [ ] Audio from all tracks mixed or selectable
- [ ] Export completes successfully with overlays

**Notes:**
FFmpeg overlay filter syntax: `[0:v][1:v]overlay=x:y[out]`. Calculate positions for corner placement.

---

## Block 8: Testing and Quality Assurance (Depends on: Block 7)

### PR-022: Unit Tests for Core Utilities
**Status:** New
**Dependencies:** PR-006, PR-010
**Priority:** Medium

**Description:**
Write unit tests for timeline utilities, time conversion functions, snap logic, trim calculations, and playback logic.

**Files (ESTIMATED - will be refined during Planning):**
- src/utils/timeline.test.js (create) - Timeline utility tests
- src/utils/playback.test.js (create) - Playback utility tests
- package.json (modify) - Add Vitest or Jest test framework
- vitest.config.js (create) - Test configuration

**Acceptance Criteria:**
- [ ] Tests for time-to-pixel conversion functions
- [ ] Tests for snap-to-edge logic
- [ ] Tests for trim calculation (constrain to clip bounds)
- [ ] Tests for clip collision detection
- [ ] All tests pass
- [ ] Test coverage at least 70% for utility files

**Notes:**
Use Vitest for Vite-based projects (fast, modern).

---

### PR-023: Integration Tests for Media Import and Export
**Status:** New
**Dependencies:** PR-004, PR-020
**Priority:** Medium

**Description:**
Write integration tests for import workflow (file selection, metadata extraction, database save) and export workflow (timeline to MP4).

**Files (ESTIMATED - will be refined during Planning):**
- src-tauri/src/tests/import_test.rs (create) - Import integration tests
- src-tauri/src/tests/export_test.rs (create) - Export integration tests
- src-tauri/src/tests/fixtures/ (create) - Test video files
- src-tauri/Cargo.toml (modify) - Test dependencies

**Acceptance Criteria:**
- [ ] Test import: file → metadata extraction → database save
- [ ] Test export: timeline JSON → FFmpeg command → output file
- [ ] Tests use fixture video files
- [ ] Tests verify output file validity
- [ ] All integration tests pass

**Notes:**
Include small test video files in repository (< 1MB each).

---

### PR-024: End-to-End Testing and Bug Fixes
**Status:** New
**Dependencies:** PR-021
**Priority:** High

**Description:**
Perform end-to-end testing of all core workflows: import, record, edit, export. Fix bugs discovered during testing. Test on both macOS and Windows if possible.

**Files (ESTIMATED - will be refined during Planning):**
- (various) - Bug fixes across codebase
- docs/testing-report.md (create) - Testing results and known issues

**Acceptance Criteria:**
- [ ] Test scenario: Record 30s screen capture, add to timeline, export
- [ ] Test scenario: Import 3 clips, arrange, trim, split, export
- [ ] Test scenario: Simultaneous screen + webcam, edit, export
- [ ] Test scenario: Timeline with 10+ clips remains responsive
- [ ] Test scenario: Export 2-minute video with multiple clips
- [ ] All critical bugs fixed
- [ ] App stable with no crashes during 15-minute editing session

**Notes:**
Focus on critical bugs first. Document known issues that are not showstoppers.

---

## Block 9: Packaging and Distribution (Depends on: Block 8)

### PR-025: Build and Packaging Configuration
**Status:** New
**Dependencies:** PR-001, PR-024
**Priority:** High

**Description:**
Configure Tauri for production builds. Set up code signing (if time permits), app icons, bundle identifiers, optimize build size.

**Files (ESTIMATED - will be refined during Planning):**
- src-tauri/tauri.conf.json (modify) - Bundle settings, icons, identifiers
- src-tauri/icons/ (create) - App icons for each platform
- src-tauri/Cargo.toml (modify) - Release profile optimization
- package.json (modify) - Build scripts
- .github/workflows/build.yml (create) - Optional: CI/CD build workflow

**Acceptance Criteria:**
- [ ] Production build generates distributable (DMG on macOS, MSI/exe on Windows)
- [ ] App icon displays correctly on each platform
- [ ] Bundle size reasonable (< 200MB with FFmpeg)
- [ ] App launches on clean machine without dev dependencies
- [ ] Build process documented in README

**Notes:**
Code signing can be skipped for MVP—focus on functional build.

---

### PR-026: Demo Video and Documentation
**Status:** New
**Dependencies:** PR-025
**Priority:** High

**Description:**
Record 3-5 minute demo video showing all core features. Update README with comprehensive setup instructions, architecture overview, and usage guide.

**Files (ESTIMATED - will be refined during Planning):**
- README.md (modify) - Setup, build, and usage instructions
- docs/demo.md (create) - Demo video script/link
- docs/usage-guide.md (create) - User guide for key features
- DEMO_VIDEO.mp4 (upload) - Demo video file

**Acceptance Criteria:**
- [ ] Demo video shows: import, screen recording, webcam recording, timeline editing, export
- [ ] Demo video is 3-5 minutes long
- [ ] README includes clear setup instructions (prerequisites, install, run)
- [ ] README includes build instructions (dev and production)
- [ ] README includes architecture overview (tech stack, structure)
- [ ] Usage guide documents key features and shortcuts

**Notes:**
Use ClipForge itself to create the demo video—dogfooding!

---

## Block 10: Final Architecture Documentation (Depends on: All previous blocks)

### PR-027: Generate Comprehensive Architecture Documentation
**Status:** New
**Dependencies:** PR-001, PR-002, PR-003, PR-004, PR-006, PR-007, PR-015, PR-019, PR-025
**Priority:** Medium

**Description:**
Create detailed technical documentation in `docs/architecture.md` that serves as the definitive reference for ClipForge's design, implementation, and operational characteristics.

**Files (ESTIMATED - will be refined during Planning):**
- docs/architecture.md (create) - Comprehensive architecture documentation

**Documentation Requirements:**

The architecture document should include:

1. **System Architecture**
   - High-level architecture overview
   - Technology stack (Tauri, Preact, Konva, FFmpeg, SQLite) and rationale
   - Integration points between frontend and Rust backend
   - Data flow patterns (import, edit, export, recording)

2. **Component Architecture**
   - Frontend component hierarchy (App → MediaLibrary/Timeline/PreviewPlayer/RecordingPanel)
   - Rust module organization (commands, database, ffmpeg, recording, export)
   - State management approach (Preact hooks/stores)
   - Konva timeline rendering architecture

3. **Data Models**
   - SQLite schema (media table, projects table)
   - Timeline JSON structure (clips, tracks, in/out points)
   - Tauri command interfaces (import_video, start_recording, export_video)
   - Media metadata structures

4. **Key Subsystems**
   - **Timeline Editor**: Konva rendering, coordinate system, time-to-pixel conversion
   - **Video Preview**: Clip calculation, HTML5 video synchronization
   - **Recording Pipeline**: Platform-specific screen capture, MediaRecorder for webcam
   - **Export Pipeline**: FFmpeg command generation, concatenation, overlays, progress reporting

5. **Security Architecture**
   - File system access patterns
   - Camera/microphone permission handling
   - Database storage location and access

6. **Deployment Architecture**
   - Build process (Tauri bundler)
   - FFmpeg binary bundling strategy
   - Cross-platform considerations (macOS vs Windows)

7. **Visual Diagrams**
   - System architecture diagram (Mermaid) showing frontend ↔ Tauri ↔ FFmpeg/SQLite
   - Data flow diagram for video export process
   - Component hierarchy diagram
   - Timeline rendering flow diagram

8. **Performance Characteristics**
   - Timeline responsiveness optimization strategies
   - Video playback synchronization approach
   - FFmpeg encoding performance
   - Memory management during long sessions

**Acceptance Criteria:**
- [ ] A developer unfamiliar with the codebase can understand the system design by reading this document
- [ ] All major architectural decisions explained with rationale
- [ ] Diagrams render correctly in markdown viewers (use Mermaid syntax)
- [ ] Document reflects the actual implemented system, not idealized design
- [ ] Covers all key subsystems (timeline, preview, recording, export)

**Notes:**
This is typically a 60-90 minute task. The agent should:
1. Read through all completed PRs to understand the implementation journey
2. Review the actual codebase to see what was built
3. Identify the key architectural patterns that emerged
4. Create clear, accurate diagrams using Mermaid syntax
5. Write for an audience of developers joining the project

---

## Summary

**Total PRs:** 27
**Dependency Blocks:** 10
**Estimated Timeline:**
- Block 1-2: 4-6 hours (foundation)
- Block 3-4: 8-10 hours (timeline core)
- Block 5: 4-5 hours (playback)
- Block 6: 6-8 hours (recording)
- Block 7: 5-6 hours (export)
- Block 8-9: 4-6 hours (testing & packaging)
- Block 10: 1-2 hours (documentation)

**Total estimated time:** 32-43 hours (well within 72-hour deadline with buffer)

**Critical Path (MVP):** PR-001 → PR-002 → PR-003 → PR-004 → PR-006 → PR-007 → PR-008 → PR-010 → PR-012 → PR-013 → PR-019 → PR-020 → PR-025

**Parallel Opportunities:**
- Blocks 1 (PR-001, PR-002, PR-003) can be worked on simultaneously by different agents
- PR-005 (media library UI) can run parallel with PR-006 (timeline setup)
- PR-017 (webcam) can run parallel with PR-016 (screen recording UI)
- Testing PRs in Block 8 can run in parallel

**Notes:**
- Focus on MVP requirements first (Blocks 1-5, PR-019, PR-020, PR-025)
- Recording features (Block 6) are important but can be prioritized after core editing works
- Stretch features (text overlays, transitions, audio controls) are out of scope for 72-hour sprint
- Final architecture documentation (Block 10) should be last—depends on all implementation
