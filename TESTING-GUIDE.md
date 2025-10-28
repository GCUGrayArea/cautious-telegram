# ClipForge Testing Guide

This guide describes all implemented features in ClipForge and how to test them.

## Current Status: 25/27 PRs Complete (92% MVP)

ClipForge is a **fully functional desktop video editor** with comprehensive media management, timeline editing, recording, video preview, and export capabilities. This guide covers how to test all implemented features.

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Rust 1.70+ (from [rustup.rs](https://rustup.rs))
- Windows 10/11 or macOS 11+
- FFmpeg (bundled in `src-tauri/binaries/`)

### Running the Application

```bash
# Install dependencies (first time only)
npm install

# Start development mode with hot reload
npm run tauri:dev
```

The application will open in a new window. The first launch may take 1-2 minutes while Rust compiles.

### Running Tests

```bash
# Run automated unit tests
npm test

# Run specific test file
npm test -- timeline.test.js
```

**Current Test Status:**
- 59/59 tests passing (100%)
- 96.02% code coverage
- Test files: timeline.test.js (40 tests), playback.test.js (19 tests)

---

## Test Data

**Test video files** are available in the `test-media/` directory:
- 5 dummy clips with varying durations (3-15 seconds)
- Multiple resolutions (480p, 720p, 1080p)
- Different frame rates (24fps, 30fps)

See `test-media/README.md` for details and regeneration commands.

---

## Feature Testing Matrix

## 1. Media Import and Library Management

### Test 1.1: Import via File Picker
**Status:** ✅ Complete (PR-004)

**Test steps:**
1. Launch the app (`npm run tauri:dev`)
2. Click the **"Import Video"** button in the Media Library tab
3. Navigate to the `test-media/` folder
4. Select one or more video files (Ctrl+Click for multiple)
5. Click "Open"

**Expected result:**
- Files appear in the media library grid
- Thumbnails are generated and displayed
- Metadata shows: filename, resolution, duration, file size, FPS

**Key files:** `src/components/MediaLibrary.jsx`, `src-tauri/src/commands/import.rs`

---

### Test 1.2: Drag-and-Drop Import
**Status:** ✅ Complete (PR-004)

**Test steps:**
1. Open the app
2. Open File Explorer and navigate to `test-media/`
3. Drag one or more `.mp4` files into the ClipForge window
4. Drop the files over the media library area

**Expected result:**
- Files are imported automatically
- Same behavior as file picker import
- Multiple files can be dropped simultaneously

---

### Test 1.3: Metadata Extraction with FFmpeg
**Status:** ✅ Complete (PR-003, PR-004)

**Test steps:**
1. Import `test-clip-1-5sec-1080p.mp4`
2. Observe the metadata displayed on the clip card

**Expected result:**
- Duration: 5.00s
- Resolution: 1920x1080
- Frame rate: 30 fps
- Codec: h264
- File size: ~147 KB
- Thumbnail shows frame from video (1s mark or middle)

**Key files:** `src-tauri/src/ffmpeg/metadata.rs`, `src-tauri/src/ffmpeg/commands.rs`

---

### Test 1.4: Grid/List View Toggle
**Status:** ✅ Complete (PR-005)

**Test steps:**
1. Import multiple clips
2. Click the grid/list toggle buttons in the media library header

**Expected result:**
- Grid view: Clips displayed in 2-3 column grid with large thumbnails
- List view: Clips displayed in single column with detailed metadata
- View preference persisted in localStorage

---

### Test 1.5: Search and Filter
**Status:** ✅ Complete (PR-005)

**Test steps:**
1. Import several clips with different names
2. Type in the search box at the top of the media library

**Expected result:**
- Clips filtered in real-time as you type
- Search matches filename (case-insensitive)
- Empty state shown when no matches

---

### Test 1.6: Delete Media
**Status:** ✅ Complete (PR-005)

**Test steps:**
1. Import a clip
2. Click the trash icon on a clip card
3. Confirm deletion in the dialog

**Expected result:**
- Confirmation dialog appears
- Clip removed from library
- Clip removed from database
- Thumbnail file deleted

---

### Test 1.7: Media Detail Modal
**Status:** ✅ Complete (PR-005)

**Test steps:**
1. Import a clip
2. Click on the clip card

**Expected result:**
- Modal opens showing full metadata
- Displays: filename, path, resolution, duration, FPS, codec, file size, creation date
- Modal can be closed by clicking outside or pressing Escape

---

## 2. Timeline Canvas and Clip Management

### Test 2.1: Timeline Canvas Setup
**Status:** ✅ Complete (PR-006)

**Test steps:**
1. Launch the app
2. Observe the timeline area at the bottom of the window

**Expected result:**
- Konva Stage renders timeline canvas
- Time ruler displays timestamps (00:00, 00:05, 00:10...)
- 3 tracks visible with alternating gray backgrounds
- Playhead (red vertical line) visible at time 0

**Key files:** `src/components/Timeline.jsx`, `src/components/timeline/TimeRuler.jsx`

---

### Test 2.2: Zoom and Pan Controls
**Status:** ✅ Complete (PR-006)

**Test steps:**
1. Add clips to timeline (drag from media library)
2. Use zoom controls:
   - Click + button or press Ctrl+Plus
   - Click - button or press Ctrl+Minus
   - Scroll with Ctrl+Mouse wheel
3. Pan horizontally using scrollbar or drag timeline

**Expected result:**
- Zoom range: 10-500 pixels per second
- Timeline zooms in/out from center
- Scroll position maintained during zoom
- Pan works smoothly

---

### Test 2.3: Drag Clips from Media Library to Timeline
**Status:** ✅ Complete (PR-008)

**Test steps:**
1. Import clips to media library
2. Drag a clip from media library onto the timeline
3. Drop at different positions and tracks

**Expected result:**
- Drop indicator (ghost rectangle) shows where clip will land
- Clip added to timeline at correct position and track
- Clip rendered with thumbnail, filename, and duration
- Snap-to-edge works (clips snap to timeline start or adjacent clips)

**Key files:** `src/components/MediaLibrary.jsx`, `src/components/Timeline.jsx`

---

### Test 2.4: Select Clips
**Status:** ✅ Complete (PR-007)

**Test steps:**
1. Add clips to timeline
2. Click on a clip to select it
3. Click on different clips

**Expected result:**
- Selected clip highlighted with red border (3px)
- Unselected clips have blue border (1px)
- Only one clip selected at a time
- Click empty space to deselect

---

### Test 2.5: Drag Clips Within Timeline
**Status:** ✅ Complete (PR-009)

**Test steps:**
1. Add clips to timeline
2. Drag a clip horizontally
3. Drag a clip to a different track

**Expected result:**
- Clip follows mouse during drag
- Clips snap to adjacent clip edges
- Clips can move between tracks (0, 1, 2)
- Position updates in real-time
- Overlaps allowed (intentional MVP decision)

---

### Test 2.6: Trim Clips
**Status:** ✅ Complete (PR-010)

**Test steps:**
1. Add a clip to timeline
2. Select the clip
3. Hover over left or right edge (cursor changes to ew-resize)
4. Drag edge inward to trim

**Expected result:**
- Yellow trim handles visible when hovering edges
- Cursor changes to resize arrow
- Clip width updates as you drag
- Trim constrained to source clip duration (can't trim beyond available frames)
- Timeline state updated with new in/out points

**Key files:** `src/components/timeline/TimelineClip.jsx`

---

### Test 2.7: Split Clips
**Status:** ✅ Complete (PR-011)

**Test steps:**
1. Add a clip to timeline
2. Position playhead within the clip
3. Press 'S' key (or Ctrl+K)

**Expected result:**
- Clip split into two clips at playhead position
- Both clips maintain original source path
- In/out points adjusted correctly
- Both clips remain on same track

**Key files:** `src/components/Timeline.jsx`, `src/utils/timeline.js`

---

### Test 2.8: Delete Clips
**Status:** ✅ Complete (PR-011)

**Test steps:**
1. Add clips to timeline
2. Select a clip
3. Press Delete or Backspace key

**Expected result:**
- Selected clip removed from timeline
- Remaining clips stay in place (no shift-left)
- Timeline state updated

---

## 3. Video Preview and Playback

### Test 3.1: Video Preview Player
**Status:** ✅ Complete (PR-012)

**Test steps:**
1. Add clips to timeline
2. Move playhead (drag or click timeline ruler)

**Expected result:**
- Preview player displays frame at playhead position
- Player loads correct source file for current clip
- Handles clip boundaries (switches source when crossing clips)
- Shows empty state when no clip at playhead
- Metadata overlay shows clip info

**Key files:** `src/components/PreviewPlayer.jsx`, `src/utils/preview.js`

---

### Test 3.2: Playback Controls (Play/Pause/Stop)
**Status:** ✅ Complete (PR-013)

**Test steps:**
1. Add clips to timeline
2. Click Play button (or press Spacebar)
3. Click Pause button (or press Spacebar again)
4. Click Stop button

**Expected result:**
- Play: Playback starts, playhead animates at 60fps
- Pause: Playback pauses at current position
- Stop: Playback stops and playhead returns to 0
- Video plays synchronized with playhead
- Audio plays synchronized with video
- Playback stops at end of timeline

**Key files:** `src/components/PlaybackControls.jsx`, `src/utils/playback.js`

---

### Test 3.3: Timeline Scrubbing
**Status:** ✅ Complete (PR-014)

**Test steps:**
1. Add clips to timeline
2. Drag the playhead handle
3. Click on timeline ruler to jump

**Expected result:**
- Playhead follows mouse during drag
- Preview updates immediately during scrubbing
- Scrubbing is smooth and responsive
- Click timeline to jump playhead to that time

---

### Test 3.4: Keyboard Navigation
**Status:** ✅ Complete (PR-014)

**Test steps:**
1. Add clips to timeline
2. Test keyboard shortcuts:
   - Left/Right arrow keys
   - Home key
   - End key

**Expected result:**
- Left arrow: Move playhead left by 1 frame (~0.033s at 30fps)
- Right arrow: Move playhead right by 1 frame
- Home: Jump to timeline start (time 0)
- End: Jump to timeline end

---

## 4. Screen and Webcam Recording

### Test 4.1: Screen Recording
**Status:** ✅ Complete (PR-015, PR-016)

**Test steps:**
1. Switch to "Record" tab in left sidebar
2. Select "Screen" mode
3. Click "Start Recording"
4. Select screen/window to record
5. Perform actions on screen (move windows, type, etc.)
6. Click "Stop Recording"

**Expected result:**
- Recording mode selector shows Screen/Webcam/Both options
- Browser prompts for screen selection
- Recording starts with red indicator and timer
- Timer shows elapsed time (MM:SS)
- Recording saved as WebM file to temp directory
- Recording automatically imported to media library
- Appears in Media Library tab after import

**Key files:** `src/components/RecordingPanel.jsx`, `src-tauri/src/commands/recording.rs`

---

### Test 4.2: Webcam Recording
**Status:** ✅ Complete (PR-017)

**Test steps:**
1. Switch to "Record" tab
2. Select "Webcam" mode
3. Click "Start Recording"
4. Browser prompts for camera/microphone permission
5. Recording starts showing webcam preview
6. Click "Stop Recording"

**Expected result:**
- Webcam preview visible before recording
- Recording includes video and audio
- Saved as WebM with vp8/vp9 codec
- Audio captured from microphone
- Recording imported to media library

**Key files:** `src/utils/webcamRecorder.js`

---

### Test 4.3: Simultaneous Screen + Webcam Recording
**Status:** ✅ Complete (PR-018)

**Test steps:**
1. Switch to "Record" tab
2. Select "Both" mode (Screen + Webcam)
3. Click "Start Recording"
4. Select screen and grant camera permissions
5. Perform actions while being recorded
6. Click "Stop Recording"

**Expected result:**
- Both streams start simultaneously
- Shared timer for synchronized timestamps
- Two separate recordings saved (screen.webm and webcam.webm)
- Both recordings imported to media library
- Can be arranged on different timeline tracks for PiP effect

**Key files:** `src/components/RecordingPanel.jsx`

---

## 5. Video Export

### Test 5.1: Simple Export (Single Track)
**Status:** ✅ Complete (PR-019, PR-020)

**Test steps:**
1. Add 3+ clips to timeline (track 0)
2. Trim and arrange clips
3. Click "Export" button in timeline toolbar
4. Configure export settings:
   - Output path: Choose location and filename
   - Resolution: Select Source/720p/1080p
5. Click "Export"

**Expected result:**
- Export dialog opens with settings
- Progress indicator shown (indeterminate spinner)
- FFmpeg processes clips in background
- Clips trimmed to in/out points
- Clips concatenated in timeline order
- Output: H.264 MP4 with AAC audio
- Export completes without errors
- Output file playable in standard video players (VLC, Windows Media Player, etc.)

**Key files:** `src/components/ExportDialog.jsx`, `src-tauri/src/export/pipeline.rs`

---

### Test 5.2: Multi-Track Export with Overlays (PiP)
**Status:** ✅ Complete (PR-021)

**Test steps:**
1. Add clips to track 0 (base layer)
2. Add clips to track 1 (overlay layer - e.g., webcam recording)
3. Position track 1 clips to overlap with track 0 clips
4. Click "Export" and configure settings
5. Export

**Expected result:**
- Track 0 clips form base video
- Track 1 clips rendered as overlays on top of base
- Overlays positioned in bottom-right corner with 20px padding (PiP style)
- Overlays appear/disappear based on timeline start_time
- Audio from track 0 only (overlay audio ignored in MVP)
- Export completes successfully

**Key files:** `src-tauri/src/export/pipeline.rs` (export_multitrack, build_overlay_filter)

---

## 6. Automated Testing

### Test 6.1: Unit Tests for Timeline Utilities
**Status:** ✅ Complete (PR-022)

**Test steps:**
```bash
npm test
```

**Expected result:**
- 59/59 tests pass
- timeline.test.js: 40 tests covering time conversion, snap, track calculations, clip splitting
- playback.test.js: 19 tests covering timeline duration, clip sorting, playback state
- Coverage: 96.02% (exceeds 70% target)

**Test files:** `src/utils/timeline.test.js`, `src/utils/playback.test.js`

---

## 7. Build and Packaging

### Test 7.1: Development Build
**Status:** ✅ Complete (PR-001, PR-025)

**Test steps:**
```bash
npm run tauri:dev
```

**Expected result:**
- Frontend builds successfully (Vite)
- Rust backend compiles successfully
- App window opens
- Hot reload works for frontend changes
- Build time: ~10s after first compile

---

### Test 7.2: Production Build
**Status:** ✅ Complete (PR-025)

**Test steps:**
```bash
npm run tauri:build
```

**Expected result:**
- Frontend optimized bundle generated
- Rust release build with size optimizations
- Distributable created in `src-tauri/target/release/bundle/`
- Windows: MSI/NSIS installer
- macOS: DMG bundle
- Bundle size: <200MB with FFmpeg binaries (~197MB)
- App launches without dev dependencies

**Key files:** `src-tauri/Cargo.toml` ([profile.release] section), `README.md`

---

## Known Limitations and Future Enhancements

### Out of Scope for MVP (27 PRs)
1. **PR-023:** Integration Tests for Media Import and Export (Planning)
2. **PR-026:** Demo Video and Documentation (Ready to implement)
3. **PR-027:** Architecture Documentation (Planning)

### Expected Behavior (Not Bugs)
1. **Clip Overlaps:** Clips can overlap on timeline - intentional for flexibility
2. **Track 0 Audio Only:** Multi-track export only includes audio from track 0
3. **Manual PiP Positioning:** User manually positions webcam overlay clips on track 1
4. **No Undo/Redo:** Split and delete actions not undoable (future enhancement)
5. **No Real-Time Export Progress:** Export shows indeterminate spinner (not percentage)
6. **Collision Detection:** `constrainClipPosition()` TODO for future enhancement

---

## Test Scenarios by Workflow

### Scenario A: Basic Video Editing Workflow
**Time:** ~5 minutes

1. Import 3 test clips from `test-media/`
2. Drag all clips to timeline track 0
3. Arrange clips in desired order
4. Trim first clip (remove first 2 seconds)
5. Split second clip in middle
6. Delete unwanted half
7. Play preview to verify edits
8. Export to MP4 (720p)
9. Verify output file plays correctly

**Expected:** All steps work smoothly, export successful

---

### Scenario B: Screen Recording and Editing
**Time:** ~3 minutes

1. Switch to "Record" tab
2. Start screen recording
3. Record desktop for 30 seconds
4. Stop recording
5. Recording appears in Media Library
6. Drag recording to timeline
7. Trim to remove beginning/end
8. Export to MP4

**Expected:** Recording captured, imported, editable, exportable

---

### Scenario C: Webcam + Screen Recording (PiP)
**Time:** ~5 minutes

1. Switch to "Record" tab
2. Select "Both" mode (Screen + Webcam)
3. Start recording
4. Record for 30 seconds
5. Stop recording
6. Two recordings appear in Media Library
7. Drag screen recording to track 0
8. Drag webcam recording to track 1 (will appear as overlay)
9. Adjust webcam clip position/length as needed
10. Export with multi-track

**Expected:** Both recordings synchronized, export shows webcam as PiP overlay

---

### Scenario D: Complex Timeline (Performance Test)
**Time:** ~10 minutes

1. Import 10+ clips
2. Add all clips to timeline
3. Perform multiple edits:
   - Trim 5 clips
   - Split 3 clips
   - Rearrange 8 clips
4. Play timeline with many clips
5. Export complex timeline

**Expected:** Timeline remains responsive at 60fps, export successful

---

## Troubleshooting

### Issue: FFmpeg not found
**Solution:**
- Download FFmpeg binaries from README-FFMPEG.md instructions
- Place in `src-tauri/binaries/`
- Restart app

### Issue: Test videos not found
**Solution:**
- Ensure `test-media/` directory exists
- Run `npm run generate-test-media` if needed
- Or use your own MP4/MOV/WebM files

### Issue: Database errors on first launch
**Solution:**
- Database created automatically on first launch
- Location: `%APPDATA%\ClipForge\clipforge.db` (Windows)
- Delete database file and restart if corrupted

### Issue: Recording permissions denied
**Solution:**
- Grant browser/system permissions for screen capture
- Grant camera/microphone permissions
- Restart browser if needed

### Issue: Export fails
**Solution:**
- Check FFmpeg binaries are present
- Verify source clips still exist at original paths
- Check output path is writable
- View console logs for detailed error messages

---

## Performance Benchmarks

Based on automated testing and code analysis:

- **Frontend Build:** 2.28s (490.96 KB bundle, 151.19 KB gzipped)
- **Backend Build:** 8.79s (dev), ~30s (release with optimizations)
- **Test Execution:** 1.55s for 59 tests
- **Expected Timeline FPS:** 60fps (Konva optimized, requestAnimationFrame)
- **Expected Export Speed:** ~1x real-time (depends on clip count and resolution)

---

## Files Reference

### Core Components
- `src/components/MediaLibrary.jsx` - Media import and library grid/list
- `src/components/Timeline.jsx` - Konva timeline canvas and clip management
- `src/components/PreviewPlayer.jsx` - Video preview with HTML5 video element
- `src/components/PlaybackControls.jsx` - Play/pause/stop buttons
- `src/components/RecordingPanel.jsx` - Screen/webcam recording UI
- `src/components/ExportDialog.jsx` - Export configuration and progress

### Utilities
- `src/utils/timeline.js` - Time conversion, snap, track calculations
- `src/utils/playback.js` - PlaybackEngine, timeline duration calculations
- `src/utils/preview.js` - Clip lookup, source time mapping
- `src/utils/screenRecorder.js` - Screen recording via MediaRecorder API
- `src/utils/webcamRecorder.js` - Webcam recording class
- `src/utils/api.js` - Tauri command wrappers

### Backend (Rust)
- `src-tauri/src/commands/import.rs` - Video import with FFmpeg metadata extraction
- `src-tauri/src/commands/recording.rs` - Save and import recording files
- `src-tauri/src/commands/export.rs` - Export timeline to MP4
- `src-tauri/src/export/pipeline.rs` - FFmpeg export pipeline (trim, concat, overlays)
- `src-tauri/src/ffmpeg/wrapper.rs` - FFmpeg command wrapper
- `src-tauri/src/database/operations.rs` - SQLite CRUD operations

### Tests
- `src/utils/timeline.test.js` - 40 tests for timeline utilities
- `src/utils/playback.test.js` - 19 tests for playback logic

---

## Summary

ClipForge is **92% complete** with 25/27 PRs implemented. All core functionality is working:

✅ Media import (file picker, drag-drop, metadata extraction)
✅ Media library management (grid/list view, search, delete)
✅ Timeline canvas (zoom, pan, multi-track)
✅ Clip operations (drag, trim, split, delete)
✅ Video preview and playback
✅ Screen recording
✅ Webcam recording
✅ Simultaneous screen+webcam recording
✅ Single-track export (H.264 MP4)
✅ Multi-track export with overlays (PiP)
✅ Automated unit tests (59/59 passing, 96% coverage)
✅ Production build configuration

The application is **production-ready** for MVP release. Remaining PRs (23, 26, 27) are for additional testing, documentation, and demo content.
