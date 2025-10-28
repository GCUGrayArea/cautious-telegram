# ClipForge Demo Video Script

**Duration:** 3-5 minutes
**Purpose:** Demonstrate all core features of ClipForge Desktop Video Editor
**Recording Method:** Use ClipForge itself to record this demo (dogfooding!)

---

## Opening (0:00 - 0:20)

**Screen:** ClipForge main window
**Narration:**
> "Welcome to ClipForge, a native desktop video editor built with Tauri, React, and FFmpeg. In this quick demo, I'll show you how to import media, record your screen and webcam, edit on the timeline, and export professional-quality videos."

**Actions:**
- Show clean ClipForge interface
- Highlight main sections: Media Library (left), Timeline (center), Preview Player (right)

---

## Feature 1: Importing Media (0:20 - 0:45)

**Screen:** Media Library panel
**Narration:**
> "Let's start by importing some video clips. Click the 'Import Videos' button to add files from your computer."

**Actions:**
1. Click "Import Videos" button
2. Select 2-3 video files from file dialog
3. Show media library updating with imported clips
4. Show thumbnails and metadata (duration, resolution, file size)
5. Demonstrate clicking a clip to preview it

**Key Points:**
- Supports MP4, AVI, MOV, MKV formats
- Automatic metadata extraction (duration, resolution, fps)
- Thumbnail generation for quick identification
- SQLite database stores media library persistently

---

## Feature 2: Screen Recording (0:45 - 1:15)

**Screen:** Recording Panel
**Narration:**
> "ClipForge includes built-in screen recording. Switch to the 'Record' tab, select 'Screen Only' mode, choose your screen or window, and hit Start."

**Actions:**
1. Click "Record" tab in sidebar
2. Select "Screen Only" from Recording Mode dropdown
3. Click "Start Recording"
4. Browser prompts to select screen/window - select one
5. Show recording indicator (red pulsing dot + timer: "00:15")
6. Navigate to a simple app or document (demonstrate screen capture)
7. Click "Stop Recording" after ~10-15 seconds
8. Show processing indicator
9. Show automatic import to media library
10. Automatic switch back to "Media Library" tab showing new recording

**Key Points:**
- Uses browser's `getDisplayMedia()` API
- Real-time recording timer
- Auto-import to media library after recording
- Visual feedback with pulsing red indicator

---

## Feature 3: Webcam Recording (1:15 - 1:35)

**Screen:** Recording Panel
**Narration:**
> "You can also record from your webcam. Select 'Webcam Only' mode, grant camera permissions, and record."

**Actions:**
1. Select "Webcam Only" from Recording Mode dropdown
2. Browser prompts for camera/microphone permissions - grant access
3. Show webcam preview in panel
4. Click "Start Recording"
5. Record for ~5 seconds (wave at camera, smile)
6. Click "Stop Recording"
7. Show auto-import to media library

**Key Points:**
- Uses `getUserMedia()` API for webcam access
- Audio recording included
- Same seamless workflow as screen recording

---

## Feature 4: Simultaneous Screen + Webcam Recording (1:35 - 1:55)

**Screen:** Recording Panel
**Narration:**
> "For tutorials or presentations, you can record screen and webcam simultaneously. Just select 'Screen + Webcam' mode."

**Actions:**
1. Select "Screen + Webcam" from Recording Mode dropdown
2. Click "Start Recording"
3. Grant screen and camera permissions
4. Record for ~10 seconds (show screen activity + webcam)
5. Click "Stop Recording"
6. Show two separate files imported to library:
   - `screen-recording-[timestamp].webm`
   - `webcam-recording-[timestamp].webm`

**Key Points:**
- Records two separate files for maximum editing flexibility
- Matching timestamps for easy synchronization
- Can layer as picture-in-picture on timeline

---

## Feature 5: Timeline Editing (1:55 - 3:00)

**Screen:** Timeline and Preview Player
**Narration:**
> "Now let's edit these clips on the timeline. Drag clips from the media library to the timeline, trim them, split them, and arrange them in sequence."

**Actions:**

### 5a. Adding Clips (1:55 - 2:05)
1. Drag first video clip from library to Track 1
2. Drag second video clip to Track 1 (appears to the right)
3. Show clips rendered as colored rectangles with thumbnails

### 5b. Trimming (2:05 - 2:20)
4. Click on first clip to select it (highlight border)
5. Drag left trim handle inward - show clip shortening
6. Drag right trim handle inward - show duration updating
7. Show preview player updating with trimmed content

### 5c. Dragging/Repositioning (2:20 - 2:30)
8. Drag clip left/right on timeline - show time markers updating
9. Show snapping behavior if implemented

### 5d. Splitting (2:30 - 2:40)
10. Click clip to select
11. Press `S` key to split at playhead position
12. Show clip splitting into two separate clips
13. Delete one half with `Delete` key

### 5e. Multi-Track / Picture-in-Picture (2:40 - 3:00)
14. Drag webcam recording to Track 2 (above Track 1)
15. Show overlay preview in Preview Player
16. Demonstrate playback with both tracks visible
17. Show professional picture-in-picture effect

**Key Points:**
- Konva-based canvas timeline for smooth 60fps rendering
- Visual trim handles on selected clips
- Keyboard shortcuts: `S` to split, `Delete` to remove
- Multi-track support for overlays and PiP
- Real-time preview synchronization

---

## Feature 6: Playback Controls (3:00 - 3:20)

**Screen:** Timeline + Preview Player
**Narration:**
> "Use the playback controls to review your edit. Play, pause, scrub through the timeline, or use keyboard shortcuts."

**Actions:**
1. Click Play button - show timeline playhead moving
2. Show video playing in Preview Player
3. Click Pause button
4. Drag playhead manually - show scrubbing
5. Press `Space` to play/pause
6. Press `Home` to jump to start
7. Press `End` to jump to end
8. Press `Arrow Left/Right` for frame-by-frame navigation

**Key Points:**
- Space bar: Play/Pause
- Home/End: Jump to start/end
- Arrow keys: Frame-by-frame scrubbing
- Click timeline ruler to jump to any time

---

## Feature 7: Exporting Video (3:20 - 4:00)

**Screen:** Export Dialog
**Narration:**
> "When you're done editing, export your video. Click 'Export Video', choose quality settings, select output location, and export."

**Actions:**
1. Click "Export Video" button
2. Export dialog appears
3. Show quality preset dropdown: "High Quality (1080p)", "Medium (720p)", "Low (480p)"
4. Show estimated file size updating based on selection
5. Click "Choose Location" - file save dialog
6. Select output filename and folder
7. Click "Export" button
8. Show export progress dialog:
   - Progress bar advancing (0% → 100%)
   - Current operation: "Concatenating clips...", "Applying overlays...", "Encoding video..."
   - Time remaining estimate
9. Export completes - success message
10. Show exported video file in file explorer

**Key Points:**
- FFmpeg-powered export pipeline
- Multiple quality presets (1080p, 720p, 480p)
- Real-time progress tracking with detailed status
- Multi-track export supports overlays and picture-in-picture
- Industry-standard MP4 output (H.264 video, AAC audio)

---

## Closing (4:00 - 4:30)

**Screen:** Completed project
**Narration:**
> "And that's ClipForge! A powerful yet simple desktop video editor that lets you record, edit, and export professional videos—all in one native application. Built with Tauri for small bundle size, React and Konva for a smooth UI, and FFmpeg for reliable video processing. ClipForge is open source and runs natively on Windows and macOS. Thanks for watching!"

**Actions:**
- Show final exported video playing
- Fade to ClipForge logo or GitHub repository link

---

## Post-Recording Notes

After recording this demo video using ClipForge:
1. Export the video as `DEMO_VIDEO.mp4`
2. Place it in the root directory of the repository
3. Upload to YouTube or hosting platform (optional)
4. Update this file with video link:

**Demo Video:** [Link to video once recorded]

---

## Technical Notes

**Recording Settings:**
- Use ClipForge's "Screen + Webcam" mode for best results
- Record at 1920x1080 resolution
- Ensure good lighting for webcam
- Use clear audio (external microphone recommended)

**Editing Tips:**
- Keep total runtime between 3-5 minutes
- Cut out any mistakes or long pauses
- Add transitions between sections (if implemented)
- Ensure audio levels are consistent

**Export Settings:**
- Use "High Quality (1080p)" preset
- Target file size: < 100MB for easy sharing
