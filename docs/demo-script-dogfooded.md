# ClipForge Dogfooded Demo Script

This demo script showcases ClipForge by using the application to create its own demo video. The process involves recording raw footage, then editing it within ClipForge itself to produce the final demo.

**Total Demo Length:** ~5-6 minutes final video
**Recording Time:** ~5-10 minutes (raw footage)
**Editing Time:** ~10-15 minutes (in ClipForge)

---

## Phase 1: Record Raw Demo Clips

Record three separate videos demonstrating different feature sets. These will be imported and edited together in Phase 2.

### Video 1: Quick Feature Tour (Target: 2 minutes)

**Setup:**
- Have a sample video file ready (MP4, ~10-30 seconds)
- Clear media library or use fresh project
- Screen recording software ready (or use ClipForge's own screen recorder if you want meta-dogfooding!)

**Shot-by-shot:**

1. **Launch ClipForge (0:00-0:05)**
   - Show desktop
   - Double-click ClipForge icon (gold film camera)
   - App opens to Media Library tab
   - *Say:* "Welcome to ClipForge, a desktop video editor built for speed and simplicity."

2. **Import Video via Drag-Drop (0:05-0:20)**
   - Open File Explorer window next to ClipForge
   - Drag sample video file into media library drop zone
   - Watch thumbnail generate
   - *Say:* "Importing videos is as simple as drag and drop. ClipForge automatically extracts metadata and generates thumbnails."
   - Click on the imported clip to show metadata modal (duration, resolution, fps, file size)
   - Close modal

3. **Media Library Features (0:20-0:35)**
   - Toggle between Grid and List view (top-right buttons)
   - *Say:* "The media library supports both grid and list views for your preference."
   - Type in search box to filter clips
   - *Say:* "Search and filter by filename to quickly find your clips."
   - Clear search

4. **Add Clip to Timeline (0:35-0:50)**
   - Click Timeline tab
   - Drag the imported clip from media library to timeline Track 1
   - Show snap-to-edge behavior when dropping
   - *Say:* "Drag clips to the timeline to start editing. Notice how clips snap to edges for precise alignment."
   - Drag another copy of the same clip to show multiple clips

5. **Basic Timeline Navigation (0:50-1:05)**
   - Click playhead in timeline ruler to jump to position
   - *Say:* "Click anywhere on the timeline to jump the playhead."
   - Drag playhead to scrub through video
   - Watch video preview update in real-time
   - *Say:* "Scrub through your video with instant preview feedback."
   - Press spacebar to play, spacebar again to pause
   - *Say:* "Spacebar plays and pauses. Arrow keys navigate frame-by-frame."
   - Press right arrow a few times to advance frame-by-frame

6. **Timeline Editing: Trim (1:05-1:20)**
   - Click on first clip to select it (yellow border appears)
   - Hover over left edge until cursor changes to resize
   - Drag left edge to trim in-point
   - *Say:* "Trim clips by dragging their edges. The yellow handles appear when selected."
   - Hover over right edge and drag to trim out-point
   - Play to show trimmed result

7. **Timeline Editing: Split (1:20-1:35)**
   - Move playhead to middle of second clip
   - Press S key (or Ctrl+K)
   - Clip splits at playhead into two clips
   - *Say:* "Press S to split a clip at the playhead. This is perfect for removing unwanted sections."
   - Click middle segment to select it
   - Press Delete key
   - Middle segment disappears
   - *Say:* "Delete removes the selected clip."

8. **Timeline Editing: Reposition (1:35-1:50)**
   - Click and drag the remaining clip horizontally
   - Show snap behavior to adjacent clip
   - *Say:* "Clips can be repositioned anywhere on the timeline. They snap to adjacent clips for frame-perfect edits."
   - Drag clip vertically to Track 2
   - *Say:* "Move clips between tracks for picture-in-picture effects."
   - Drag back to Track 1

9. **Keyboard Shortcuts Summary (1:50-2:00)**
   - Show on-screen text or verbally list shortcuts
   - *Say:* "ClipForge supports professional keyboard shortcuts: Spacebar for play/pause, S for split, Delete to remove clips, arrow keys for navigation, and Ctrl-Z for undo."
   - Press Ctrl-Z a few times to show undo in action
   - Press Ctrl-Y to redo

---

### Video 2: Recording Features (Target: 1.5 minutes)

**Setup:**
- Clear timeline or start fresh project
- Have something interesting on screen to record (e.g., open a folder, browse a website)
- If you have a webcam, make sure it's connected and working

**Shot-by-shot:**

1. **Screen Recording Introduction (0:00-0:10)**
   - Click "Record Screen" tab in ClipForge
   - *Say:* "ClipForge has built-in screen recording. Let's capture some footage."
   - Show the recording panel with Start/Stop buttons

2. **Start Screen Recording with PiP Preview (0:10-0:30)**
   - Click "Start Recording" button
   - Browser prompt appears asking to select screen/window
   - Select entire screen or specific window
   - Recording starts - timer begins counting (00:00, 00:01, 00:02...)
   - Red pulsing recording indicator visible
   - **PiP preview window appears showing live feed** (320x180px in corner)
   - *Say:* "Notice the picture-in-picture preview showing exactly what's being recorded in real-time."
   - Drag the PiP preview to different position to show it's movable
   - Perform some screen actions (open folder, click around, type something)
   - *Say:* "I'll record myself for a few seconds..."
   - Wait ~10 seconds

3. **Stop Recording and Auto-Import (0:30-0:45)**
   - Click "Stop Recording" button
   - Recording stops, timer resets
   - ClipForge automatically switches to Media Library tab
   - New recording appears with timestamp filename (recording_20251029_143045.webm)
   - Thumbnail generated
   - *Say:* "Recording stops and automatically imports to your media library with a timestamp filename."
   - Click on the new recording to show metadata (duration matches recording time)

4. **Webcam Recording (0:45-1:05)**
   - Click "Record Screen" tab again (or "Webcam" if you have separate tabs)
   - Show webcam recording interface
   - Click device selection dropdown (if multiple cameras available)
   - Select camera
   - Webcam preview appears showing your face
   - *Say:* "ClipForge also supports webcam recording with device selection."
   - Click "Start Recording" for webcam
   - Wave at camera or say something
   - Wait ~5 seconds
   - Click "Stop Recording"
   - Auto-imports to media library

5. **Simultaneous Screen + Webcam Recording (1:05-1:30)**
   - Go back to recording interface
   - *Say:* "Here's where it gets powerful - simultaneous screen and webcam recording."
   - Click "Start Recording" with option for both screen and webcam (if UI supports it, otherwise explain feature)
   - Both streams start recording with synchronized timestamps
   - PiP preview shows screen content
   - Perform some screen action while visible in webcam
   - Wait ~10 seconds
   - Stop recording
   - *Say:* "Both recordings are saved with matching timestamps and automatically placed on separate timeline tracks - perfect for tutorial videos."
   - Switch to Media Library to show both files imported

---

### Video 3: Advanced Editing Features (Target: 1.5 minutes)

**Setup:**
- Have timeline with 2-3 clips already arranged
- Have screen + webcam recordings from Video 2 available

**Shot-by-shot:**

1. **Multi-Track Timeline Setup (0:00-0:15)**
   - Click Timeline tab
   - Drag screen recording to Track 0 (bottom track)
   - Drag webcam recording to Track 1 (middle track)
   - Align them at the same start time (0:00)
   - *Say:* "Multi-track editing enables picture-in-picture effects. Track 0 is your main video, Track 1 overlays on top."
   - Play to show PiP preview (webcam in corner of screen recording)

2. **Undo/Redo (0:15-0:30)**
   - Delete one of the clips
   - *Say:* "Made a mistake? No problem."
   - Press Ctrl-Z to undo deletion
   - Clip reappears
   - *Say:* "Ctrl-Z undoes, Ctrl-Y redoes. ClipForge tracks up to 50 operations."
   - Press Ctrl-Z again to undo something else
   - Press Ctrl-Y to redo

3. **Copy/Paste Clips (0:30-0:45)**
   - Select a clip on timeline
   - Press Ctrl-C
   - *Say:* "Copy and paste works just like any other application."
   - Move playhead to new position
   - Press Ctrl-V
   - Clip appears at playhead position
   - *Say:* "Pasted clip appears at the playhead with all properties preserved."

4. **Text Overlays (0:45-1:05)**
   - Click "Add Text" button (or similar UI element)
   - Text overlay editor appears
   - Type "ClipForge Demo" in text field
   - Change font size to 48px
   - Change color to white
   - Select position: Top Center
   - Select animation: Fade In
   - Set fade duration: 1s
   - *Say:* "Add text overlays with customizable fonts, colors, positions, and animations."
   - Click OK/Apply
   - Text overlay appears on timeline as a separate element
   - Play to show text fade in over video

5. **Audio Controls (1:05-1:20)**
   - Select a clip with audio
   - Open audio controls panel (if separate) or show inline controls
   - *Say:* "Professional audio controls give you precise mixing."
   - Adjust volume slider from 100% to 150%
   - *Say:* "Volume can go from 0 to 200 percent."
   - Adjust volume back to 100%
   - Set "Fade In" duration to 2 seconds
   - Set "Fade Out" duration to 2 seconds
   - *Say:* "Add fade in and fade out for smooth audio transitions."
   - Play clip to hear fade effect

6. **Auto-Save Indicator (1:20-1:30)**
   - Point to "Saved" indicator in UI (if visible)
   - *Say:* "ClipForge automatically saves your project every 30 seconds. No more lost work from crashes."
   - Make a change to timeline
   - Watch "Saved" indicator update after 30 seconds (or speed up video in post if needed)
   - *Say:* "When you restart ClipForge, your project loads exactly where you left off."

---

## Phase 2: Edit the Demo in ClipForge (Dogfooding!)

Now use ClipForge itself to edit Videos 1-3 into a polished final demo. This is the meta-demonstration that proves ClipForge is functional.

### Step 1: Import All Recordings

1. Launch ClipForge (if not already open)
2. Navigate to Media Library tab
3. Import all three recordings:
   - Video 1 (Quick Feature Tour) ~2 minutes
   - Video 2 (Recording Features) ~1.5 minutes
   - Video 3 (Advanced Editing) ~1.5 minutes
4. Wait for thumbnails to generate
5. Verify all clips have correct durations

### Step 2: Arrange on Timeline

1. Switch to Timeline tab
2. Drag Video 1 to Track 0, starting at 0:00
3. Drag Video 2 to Track 0, snapping to the end of Video 1 (~2:00)
4. Drag Video 3 to Track 0, snapping to the end of Video 2 (~3:30)
5. Total timeline duration should be ~5:00

### Step 3: Add Title Overlay

1. Move playhead to 0:00 (very start)
2. Click "Add Text" button
3. Configure title overlay:
   - **Text:** "ClipForge Video Editor"
   - **Font:** Arial Bold (or similar professional font)
   - **Size:** 64px
   - **Color:** White (#FFFFFF)
   - **Position:** Center
   - **Animation:** Slide In from Left
   - **Duration:** 3 seconds (0:00 to 0:03)
   - **Fade In:** 0.5s
   - **Fade Out:** 0.5s
4. Apply and verify text appears on timeline
5. Play from 0:00 to watch title slide in

### Step 4: Add Section Title Overlays

1. **"Quick Tour" title at 0:00:**
   - Add text overlay at 0:00
   - Text: "Quick Tour"
   - Size: 32px
   - Position: Top Left
   - Duration: 3 seconds (0:00-0:03)
   - Animation: Fade In
   - Color: Yellow (#FFD700)

2. **"Recording Features" title at 2:00:**
   - Move playhead to 2:00 (start of Video 2)
   - Add text overlay
   - Text: "Recording Features"
   - Size: 32px
   - Position: Top Left
   - Duration: 3 seconds (2:00-2:03)
   - Animation: Fade In
   - Color: Yellow (#FFD700)

3. **"Advanced Editing" title at 3:30:**
   - Move playhead to 3:30 (start of Video 3)
   - Add text overlay
   - Text: "Advanced Editing"
   - Size: 32px
   - Position: Top Left
   - Duration: 3 seconds (3:30-3:33)
   - Animation: Fade In
   - Color: Yellow (#FFD700)

### Step 5: Trim Awkward Pauses

1. Scrub through entire timeline looking for:
   - Long pauses between speaking
   - Mistakes or stutters
   - Dead air at beginning/end of clips
2. For each awkward pause:
   - Position playhead at start of pause
   - Press S to split
   - Position playhead at end of pause
   - Press S to split again
   - Select middle segment (the pause)
   - Press Delete to remove
3. Recommended trim points:
   - **Video 1:** Trim any gap between intro and first action
   - **Video 2:** Trim waiting time during recording start/stop
   - **Video 3:** Trim delays when opening menus or dialogs
4. After trimming, clips should snap together with no gaps

### Step 6: Add Audio Fades

1. Select the first clip on timeline (Video 1)
2. Open audio controls
3. Set **Fade In:** 2 seconds
4. Select the last clip on timeline (Video 3)
5. Set **Fade Out:** 2 seconds
6. Play beginning and end to verify smooth audio transitions

### Step 7: Export with YouTube Preset

1. Click "Export" button (or menu option)
2. Export dialog appears
3. Select preset: **YouTube (1080p, H.264)**
4. Click file picker to choose output location
5. Save as: "ClipForge_Demo_Final.mp4"
6. Click "Start Export"
7. Watch progress bar advance (with percentage and operation status):
   - Trimming clips... 0-40%
   - Concatenating... 40-60%
   - Encoding... 60-95%
   - Finalizing... 95-100%
8. Export completes - "Export Successful" notification
9. Click "Open in Media Library" (or manually navigate)

### Step 8: Verify Export Quality

1. Import the exported "ClipForge_Demo_Final.mp4" back into ClipForge
2. Drag to timeline to preview
3. Play through entire video to check:
   - All three sections present in order
   - Title overlays appear correctly with animations
   - Section titles fade in at right times
   - Audio fades smoothly at start and end
   - No encoding artifacts or glitches
   - Export quality is 1080p (check metadata)
4. If issues found, return to Step 2-7 to fix and re-export

---

## Phase 3: Generate Transcript (Show PR-STRETCH-011)

This phase demonstrates the one-click transcription feature using Whisper API.

### Step 1: Initiate Transcription

1. With the final exported video ("ClipForge_Demo_Final.mp4") selected in Media Library
2. Click "Transcribe" button (should be visible in clip details or context menu)
3. Transcription modal appears showing:
   - "Transcribing audio..." status
   - Progress indicator (if available)
4. Wait for Whisper API processing (~30-60 seconds for 5-minute video)

### Step 2: Review Transcript

1. Transcript modal displays full text of spoken dialog from all three videos
2. Scroll through transcript to verify accuracy
3. Expected transcript sections:
   - **Section 1 (0:00-2:00):** "Welcome to ClipForge... importing videos... drag and drop..." etc.
   - **Section 2 (2:00-3:30):** "ClipForge has built-in screen recording..." etc.
   - **Section 3 (3:30-5:00):** "Multi-track editing enables..." etc.
4. Check for any transcription errors (should be minimal with clear audio)

### Step 3: Copy and Save Transcript

1. Click "Copy to Clipboard" button in transcript modal
2. Open Notepad (or any text editor)
3. Paste transcript (Ctrl-V)
4. Show full transcript text in editor
5. Return to ClipForge transcript modal
6. Click "Save as .txt file" button
7. File save dialog appears
8. Save as: "ClipForge_Demo_Transcript.txt"
9. Navigate to saved file location in File Explorer
10. Show that file exists with correct size (~1-3 KB depending on transcript length)

---

## Phase 4: Show the Results

The grand finale - demonstrate what you've created and highlight key accomplishments.

### Step 1: Play Final Video

1. Open ClipForge
2. Navigate to Media Library
3. Double-click "ClipForge_Demo_Final.mp4" to load in preview player
4. Maximize preview player (or make it prominent)
5. Press spacebar to play from beginning
6. Let video play through completely (5-6 minutes)
7. Watch for:
   - Title overlay "ClipForge Video Editor" sliding in
   - Section transitions with yellow titles
   - All three demo segments playing smoothly
   - Audio fading in at start, fading out at end
   - Professional export quality

### Step 2: Show Transcript Side-by-Side

1. Open "ClipForge_Demo_Transcript.txt" in Notepad
2. Position Notepad window next to ClipForge window (split screen)
3. Scroll through transcript while video plays
4. Point out synchronization:
   - Transcript text matches spoken words
   - Timestamps (if included by Whisper) align with video
5. *Say:* "The transcript was generated automatically with one click using Whisper AI."

### Step 3: Highlight Key Features Demonstrated

Create a summary overlay or verbal list of everything demonstrated:

**Recording & Import:**
- ✅ Drag-and-drop video import
- ✅ Automatic thumbnail generation
- ✅ Screen recording with PiP preview
- ✅ Webcam recording with device selection
- ✅ Simultaneous screen + webcam recording

**Timeline Editing:**
- ✅ Multi-track editing (3 tracks)
- ✅ Drag clips to reposition
- ✅ Trim clips with edge handles
- ✅ Split clips at playhead (S key)
- ✅ Delete clips (Delete key)
- ✅ Snap-to-edge for precise alignment

**Advanced Features:**
- ✅ Text overlays with animations (slide, fade)
- ✅ Audio controls (volume 0-200%, fade in/out)
- ✅ Copy/paste clips (Ctrl-C/Ctrl-V)
- ✅ Undo/redo (Ctrl-Z/Ctrl-Y) - 50 operation history
- ✅ Auto-save every 30 seconds

**Export & Post-Production:**
- ✅ Export presets (YouTube 1080p shown)
- ✅ Real-time progress bar with percentage
- ✅ Professional H.264 MP4 output
- ✅ One-click transcription (Whisper API)
- ✅ Copy transcript to clipboard
- ✅ Save transcript as .txt file

**User Experience:**
- ✅ Keyboard shortcuts (spacebar, arrows, S, Delete, Ctrl-Z/Y/C/V/X)
- ✅ Grid/List view toggle
- ✅ Search/filter media library
- ✅ Real-time video preview during scrubbing
- ✅ Responsive timeline with zoom (Ctrl+scroll)

### Step 4: Closing Statement

*Say (on camera or voiceover):*

> "What you just watched was created entirely within ClipForge - from recording the raw footage, to editing it together, to generating the transcript. This is a production-ready video editor with professional features, built with Tauri, React, and FFmpeg. ClipForge proves that desktop applications can be powerful, fast, and user-friendly.
>
> Key stats:
> - 44 completed features across MVP, bugfixes, and stretch goals
> - 96% test coverage with 72 passing tests
> - Multi-track timeline with PiP support
> - Built-in screen and webcam recording
> - One-click AI transcription
> - Export presets for 9 major platforms
>
> ClipForge is ready for real-world use. Try it yourself."

### Step 5: Show Credits/Resources (Optional)

Create a final text overlay or slide showing:

```
ClipForge Video Editor
github.com/[your-username]/clipforge

Built with:
- Tauri v1.x (Rust + WebView)
- React + Vite
- Konva.js (Timeline)
- FFmpeg 8.0 (Video Processing)
- Whisper API (Transcription)

License: [Your License]
```

---

## Tips for Recording

### Audio Quality
- Use a decent microphone (not laptop built-in if possible)
- Record in a quiet room
- Speak clearly and at moderate pace
- Leave 0.5-1 second pauses between sentences (easier to edit)

### Video Quality
- Record at 1920x1080 resolution minimum
- Use 30fps or 60fps
- Ensure good lighting if showing webcam
- Keep cursor movements smooth and deliberate
- Zoom in on UI elements when demonstrating features (if screen recorder supports it)

### Pacing
- Don't rush - give viewers time to see what's happening
- Pause after each action (e.g., after clicking a button, wait 1 second before speaking)
- Avoid excessive "um" and "uh" filler words (can be trimmed in Phase 2)

### Screen Recording Settings
- Hide desktop clutter (close unnecessary windows)
- Disable notifications (Windows Focus Assist or macOS Do Not Disturb)
- Use dark mode or light mode consistently
- Consider scaling UI elements larger if recording at 4K to 1080p

### Editing Tips for Phase 2
- Watch through each raw video first to identify cut points
- Use markers or notes to plan section titles
- Keep total runtime under 6 minutes (YouTube attention span)
- Add 0.5s black frames at start/end if needed for clean fades

---

## Distribution Checklist

After completing the demo:

- [ ] Export final video as "ClipForge_Demo_Final.mp4"
- [ ] Save transcript as "ClipForge_Demo_Transcript.txt"
- [ ] Upload video to YouTube (or hosting platform)
- [ ] Add transcript as closed captions/subtitles
- [ ] Link video in project README
- [ ] Share on social media with key feature highlights
- [ ] Create GIF clips of standout features (screen recording, PiP, text overlays)
- [ ] Update docs/demo-video.md with final video URL

---

## Meta-Dogfooding Achievement Unlocked

By completing this demo, you've proven:

1. **ClipForge can record its own demonstration** (screen + webcam capture working)
2. **ClipForge can edit its own demonstration** (timeline, trimming, multi-track all functional)
3. **ClipForge can add professional polish** (text overlays, audio fades working)
4. **ClipForge can export production-quality video** (H.264 MP4 suitable for YouTube)
5. **ClipForge can transcribe its own demonstration** (Whisper integration working)

This is the ultimate validation of a working product. Good luck with the recording!
