# ClipForge Usage Guide

A comprehensive guide to using ClipForge Desktop Video Editor.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Media Library](#media-library)
3. [Recording](#recording)
4. [Timeline Editing](#timeline-editing)
5. [Video Preview](#video-preview)
6. [Exporting](#exporting)
7. [Keyboard Shortcuts](#keyboard-shortcuts)
8. [Tips and Best Practices](#tips-and-best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Getting Started

### First Launch

When you first launch ClipForge, you'll see three main panels:

- **Left Sidebar:** Media Library and Recording controls (tabs)
- **Center:** Timeline canvas for arranging and editing clips
- **Right Panel:** Video Preview Player with playback controls

### Workflow Overview

The typical ClipForge workflow:

1. **Import or Record** media using the left sidebar
2. **Arrange clips** on the timeline by dragging from the library
3. **Edit clips** using trim, split, and delete operations
4. **Preview** your edit in the preview player
5. **Export** the final video to MP4

---

## Media Library

### Importing Videos

1. Click the **"Media Library"** tab in the left sidebar (if not already active)
2. Click the **"Import Videos"** button
3. Select one or more video files from the file dialog
4. Supported formats: **MP4, AVI, MOV, MKV**

### Viewing Media

- Each imported clip shows:
  - **Thumbnail** preview
  - **Filename**
  - **Duration** (MM:SS)
  - **Resolution** (e.g., 1920x1080)
  - **File size** (MB)

- Click any clip to preview it in the Preview Player

### Managing Media

- **Search/Filter:** Media library displays all imported clips (no search yet - future feature)
- **Refresh:** Library automatically refreshes when new recordings are added
- **Persistence:** All imported media is stored in SQLite database and persists across sessions

---

## Recording

ClipForge includes built-in screen and webcam recording.

### Recording Modes

Switch to the **"Record"** tab in the left sidebar to access recording controls.

Three recording modes available:

1. **Screen Only** - Capture your screen or a specific window
2. **Webcam Only** - Record from your camera with audio
3. **Screen + Webcam** - Record both simultaneously (creates two separate files)

### Screen Recording

**Steps:**
1. Select **"Screen Only"** from the Recording Mode dropdown
2. Click **"Start Recording"**
3. Browser will prompt you to choose a screen, window, or browser tab
4. Select your desired source and click **"Share"**
5. Recording begins - you'll see:
   - Red pulsing indicator
   - "Recording..." text
   - Elapsed time timer (MM:SS)
6. Click **"Stop Recording"** when done
7. Recording is automatically:
   - Saved to temp directory
   - Imported to media library
   - Displayed in the library (view switches to Media Library tab)

**Permissions:**
- First time: Browser will ask permission to capture screen
- Grant permission to enable screen recording
- You can choose which screen/window to share each time you record

### Webcam Recording

**Steps:**
1. Select **"Webcam Only"** from the Recording Mode dropdown
2. Click **"Start Recording"**
3. Browser will prompt for camera and microphone permissions (first time)
4. Grant permissions
5. You'll see a webcam preview in the panel
6. Click **"Start Recording"** to begin
7. Record your webcam clip
8. Click **"Stop Recording"** when done
9. Recording is automatically imported to media library

**Permissions:**
- Camera and microphone access required
- Grant permissions when browser prompts
- Permissions persist for future sessions

### Simultaneous Screen + Webcam Recording

**Steps:**
1. Select **"Screen + Webcam"** from the Recording Mode dropdown
2. Click **"Start Recording"**
3. Grant screen capture permissions (browser prompt)
4. Grant camera/microphone permissions (browser prompt)
5. Both sources record simultaneously
6. Click **"Stop Recording"** when done
7. **Two separate files** are imported:
   - `screen-recording-[timestamp].webm`
   - `webcam-recording-[timestamp].webm`

**Why two files?**
- Maximum editing flexibility
- You can layer them on separate tracks for picture-in-picture effects
- Matching timestamps make synchronization easy
- You can delete one if you don't need it

**Recording Tips:**
- Close unnecessary applications before recording to improve performance
- Ensure good lighting for webcam recordings
- Test audio levels before long recordings
- Use an external microphone for better audio quality

---

## Timeline Editing

The timeline is the heart of ClipForge. Here you arrange, trim, split, and layer your clips.

### Timeline Structure

- **Horizontal axis:** Time (seconds)
- **Vertical axis:** Tracks (Track 1, Track 2, etc.)
- **Track 1 (bottom):** Main video track
- **Track 2+ (above):** Overlay tracks for picture-in-picture effects

### Adding Clips to Timeline

**Drag and Drop:**
1. Drag a clip from the Media Library
2. Drop it onto the timeline at your desired position
3. Clip appears as a colored rectangle with thumbnail preview
4. Clips on the same track automatically arrange left-to-right

**Multiple Clips:**
- Add multiple clips to Track 1 for sequential playback
- Add clips to Track 2 for overlays (picture-in-picture)

### Selecting Clips

- **Click** on a clip to select it
- Selected clip shows a **colored border** (usually yellow or blue)
- Only one clip can be selected at a time

### Trimming Clips

Trim clips to remove unwanted footage from the beginning or end.

**Steps:**
1. Click a clip to select it
2. **Trim handles** appear on left and right edges (small yellow/colored bars)
3. Drag the **left handle** inward to trim the start (adjusts in-point)
4. Drag the **right handle** inward to trim the end (adjusts out-point)
5. The clip shortens on the timeline
6. Preview Player updates to show trimmed content

**Constraints:**
- Minimum clip duration: **0.1 seconds**
- Cannot trim beyond source video duration
- Visual feedback: cursor changes to `ew-resize` (←→)

### Moving/Repositioning Clips

**Steps:**
1. Click and drag a clip left or right on the timeline
2. Release to place it at the new position
3. `startTime` property updates automatically

**Gap Behavior:**
- Clips can have gaps between them (empty space on timeline)
- Gaps result in black frames during playback/export

### Splitting Clips

Split a single clip into two separate clips at a specific point.

**Steps:**
1. Click a clip to select it
2. Move the **playhead** (vertical red line) to the desired split position
3. Press the **`S` key**
4. The clip splits into two clips at the playhead position
5. Each new clip becomes an independent object
6. You can now move, trim, or delete them separately

**Use Cases:**
- Remove a middle section of a clip (split, then delete unwanted part)
- Insert a clip in the middle of another clip
- Apply different edits to different parts of the same source video

### Deleting Clips

**Steps:**
1. Click a clip to select it
2. Press the **`Delete` key** (or `Backspace` on Mac)
3. Clip is removed from the timeline
4. Other clips are not affected (no auto-ripple delete yet)

### Multi-Track Editing (Picture-in-Picture)

Layer clips on multiple tracks to create overlays.

**Example: Screen Recording with Webcam PiP**
1. Add screen recording to **Track 1** (main video)
2. Add webcam recording to **Track 2** (overlay)
3. Align the clips in time (drag webcam clip to match start position)
4. Preview Player shows **webcam overlay on top of screen video**
5. Export produces a single video with picture-in-picture effect

**Track Rendering Order:**
- Track 1 (bottom): Background layer
- Track 2 (above): Foreground overlay
- Track 3+: Additional overlays (future support)

**Current Limitations:**
- No resize/repositioning of overlays (full-frame overlay only)
- Future: Add position controls for overlay clips (corner placement, scaling)

---

## Video Preview

The Preview Player shows what your final export will look like.

### Playback Controls

Located below the video preview:

- **Play Button (▶)**: Start playback
- **Pause Button (⏸)**: Pause playback
- **Time Display**: Shows current time / total duration (MM:SS / MM:SS)

### Timeline Playhead

- **Red vertical line** on the timeline indicates current playback position
- **Drag the playhead** left/right to scrub through the video
- **Click the timeline ruler** (top bar with time markers) to jump to a specific time

### Playback Behavior

- Playback follows the timeline clips:
  - Plays visible clips in order
  - Respects trim points (in/out points)
  - Shows overlays from Track 2+
  - Black frames appear during gaps between clips

- Preview Player **synchronizes with timeline**:
  - As playhead moves, preview updates in real-time
  - Scrubbing provides instant visual feedback

---

## Exporting

Export your edited timeline to a shareable MP4 video file.

### Export Steps

1. Click the **"Export Video"** button (typically in toolbar or menu)
2. **Export Dialog** opens with options:
   - **Quality Preset:** High (1080p), Medium (720p), Low (480p)
   - **Estimated File Size:** Updates based on preset and timeline duration
3. Click **"Choose Location"**
4. Select output filename and folder in file save dialog
5. Click **"Export"** button to start
6. **Export Progress Dialog** appears showing:
   - Progress bar (0% → 100%)
   - Current operation (e.g., "Concatenating clips...", "Encoding video...")
   - Time remaining estimate
7. When complete: **"Export Successful"** message
8. Find your exported video at the chosen location

### Quality Presets

ClipForge offers three quality presets:

| Preset | Resolution | Target Bitrate | Use Case |
|--------|------------|----------------|----------|
| **High Quality** | 1080p (1920x1080) | 5000k | Best quality, larger file size |
| **Medium** | 720p (1280x720) | 2500k | Balanced quality and size |
| **Low** | 480p (854x480) | 1000k | Smallest file size, faster exports |

### Export Format

- **Container:** MP4
- **Video Codec:** H.264 (libx264)
- **Audio Codec:** AAC
- **Framerate:** 30 fps (matches source or default)
- **Compatibility:** Plays on all modern devices and platforms

### Multi-Track Export

When exporting a multi-track timeline:
- Track 1: Base video layer
- Track 2+: Overlaid on top (picture-in-picture effect)
- FFmpeg filter_complex handles overlay composition
- Result: Single MP4 file with all layers composited

### Export Performance

- **Speed:** Real-time or faster depending on hardware
- **CPU Usage:** High during export (FFmpeg encoding)
- **Cancel:** Close export dialog to cancel (future: add explicit cancel button)

---

## Keyboard Shortcuts

Master these shortcuts for faster editing.

### Playback

| Shortcut | Action |
|----------|--------|
| `Space` | Play / Pause |
| `Home` | Jump to timeline start (time 0) |
| `End` | Jump to timeline end |
| `Arrow Left` | Move playhead backward one frame (~0.033s at 30fps) |
| `Arrow Right` | Move playhead forward one frame (~0.033s at 30fps) |

### Editing

| Shortcut | Action |
|----------|--------|
| `S` | Split selected clip at playhead position |
| `Delete` (or `Backspace`) | Delete selected clip |
| `Escape` | Deselect clip |

### Navigation

| Shortcut | Action |
|----------|--------|
| Click Timeline Ruler | Jump playhead to clicked time |
| Drag Playhead | Scrub through timeline |

### Future Shortcuts (Not Yet Implemented)

These shortcuts are commonly requested and may be added in future versions:

- `Ctrl+Z` / `Cmd+Z`: Undo
- `Ctrl+Y` / `Cmd+Y`: Redo
- `Ctrl+C` / `Cmd+C`: Copy clip
- `Ctrl+V` / `Cmd+V`: Paste clip
- `Ctrl+X` / `Cmd+X`: Cut clip
- `Ctrl+A` / `Cmd+A`: Select all clips
- `R`: Ripple delete (delete and close gap)

---

## Tips and Best Practices

### Recording Tips

1. **Test First:** Record a 5-second test clip before long recordings
2. **Close Background Apps:** Free up CPU/RAM for smooth recording
3. **Check Audio:** Ensure microphone is working before recording
4. **Use External Mic:** Built-in laptop mics pick up fan noise
5. **Good Lighting:** Webcam recordings need well-lit environments
6. **Plan Ahead:** Script your recording to minimize editing work

### Editing Tips

1. **Trim Liberally:** Remove dead space at start/end of clips
2. **Use Splits:** Split clips to remove mistakes or long pauses
3. **Align Clips:** When using Screen + Webcam, align start times carefully
4. **Preview Often:** Play through your edit before exporting
5. **Save Projects:** (Future feature) - For now, don't close app mid-edit

### Export Tips

1. **Choose Quality Wisely:**
   - YouTube/Vimeo: Use High (1080p)
   - Twitter/Social: Use Medium (720p)
   - Email/Quick Share: Use Low (480p)
2. **Check File Size:** Estimated size shown in export dialog
3. **Test Export:** Export a short section first to check quality
4. **Keep Source Files:** Don't delete recordings until export is successful

### Performance Tips

1. **Use Smaller Source Files:** Large 4K videos may cause lag
2. **Close Unused Apps:** Free up system resources
3. **Avoid Excessive Tracks:** 2-3 tracks maximum for best performance
4. **Update Drivers:** Ensure graphics drivers are current

---

## Troubleshooting

### Recording Issues

**Problem: "Permission Denied" when recording screen**
- **Solution:** Grant screen capture permission in browser prompt
- Chrome/Edge: Click "Share" when prompted
- Make sure no other app is blocking screen capture

**Problem: "Permission Denied" when recording webcam**
- **Solution:** Grant camera/microphone permissions in browser
- Check browser settings: Allow camera/microphone for localhost
- Restart browser if permissions are stuck

**Problem: Recording doesn't import to library**
- **Solution:** Check that temp directory is writable
- Check browser console for error messages (F12 → Console)
- Restart application

**Problem: Webcam preview is black**
- **Solution:**
  - Check that camera is not in use by another app (Zoom, Skype, etc.)
  - Try unplugging and replugging camera
  - Grant camera permissions if prompted

### Playback Issues

**Problem: Preview Player shows black screen**
- **Solution:**
  - Ensure clips are added to timeline
  - Check that playhead is within clip duration
  - Try reloading the app

**Problem: Playback is laggy or stuttering**
- **Solution:**
  - Use smaller/lower resolution source videos
  - Close background apps to free up CPU
  - Reduce number of timeline tracks

**Problem: Audio is out of sync**
- **Solution:**
  - This can happen with variable framerate (VFR) videos
  - Re-encode source videos to constant framerate (CFR) before importing
  - Use FFmpeg: `ffmpeg -i input.mp4 -r 30 -c:v libx264 -crf 18 output.mp4`

### Export Issues

**Problem: Export fails with error**
- **Solution:**
  - Check FFmpeg binaries are in `src-tauri/binaries/`
  - Ensure output location is writable
  - Check browser console for FFmpeg error messages
  - Try exporting to a different location

**Problem: Exported video is corrupted or won't play**
- **Solution:**
  - Try a different quality preset
  - Ensure source clips are valid (play them in VLC or similar)
  - Re-import source clips and try again

**Problem: Export is very slow**
- **Solution:**
  - Lower the quality preset (e.g., use Medium instead of High)
  - Export speed depends on CPU performance
  - Close other apps during export
  - Long timelines with many clips take longer

### General Issues

**Problem: Application won't launch**
- **Solution:**
  - Check that all prerequisites are installed (Node.js, Rust, FFmpeg)
  - Try running `npm install` again
  - Check error messages in terminal

**Problem: Database errors on startup**
- **Solution:**
  - Database file may be corrupted
  - Locate `clipforge.db` in app data directory:
    - Windows: `%APPDATA%\ClipForge\clipforge.db`
    - macOS: `~/Library/Application Support/ClipForge/clipforge.db`
  - Backup and delete the file (media library will reset)
  - Restart application

**Problem: Media library is empty after restart**
- **Solution:**
  - Check that database file exists (see above)
  - Reimport your media files
  - Check browser console for database connection errors

---

## Getting Help

If you encounter issues not covered in this guide:

1. **Check GitHub Issues:** [Repository Issues Page](https://github.com/yourusername/cautious-telegram/issues)
2. **Open a New Issue:** Provide:
   - Steps to reproduce
   - Error messages (from browser console: F12 → Console)
   - Operating system and version
   - ClipForge version
3. **Contributing:** PRs welcome! See `docs/task-list.md` for development workflow

---

## Feature Roadmap

Planned features for future releases:

- **Project Persistence:** Save and load timeline projects
- **Undo/Redo:** Full history management
- **Audio Controls:** Volume adjustment, fade in/out
- **Transitions:** Fade, wipe, dissolve between clips
- **Text Overlays:** Add titles and captions
- **Color Grading:** Brightness, contrast, saturation controls
- **Zoom Controls:** Timeline zoom in/out for precision editing
- **Clip Resize/Position:** Adjust overlay position and scale
- **Audio Tracks:** Separate audio tracks for music and voiceover
- **Batch Export:** Export multiple projects at once

---

## Keyboard Reference Card

Print this for quick reference:

```
PLAYBACK
Space          Play / Pause
Home           Jump to start
End            Jump to end
Arrow Left     Previous frame
Arrow Right    Next frame

EDITING
S              Split clip at playhead
Delete         Delete selected clip
Escape         Deselect clip

NAVIGATION
Click Ruler    Jump playhead to time
Drag Playhead  Scrub timeline
```

---

**ClipForge Version:** 0.1.0
**Last Updated:** 2025-10-27
**Documentation:** For more details, see `docs/prd.md` and `docs/task-list.md`
