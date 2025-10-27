# Product Requirements Document: ClipForge

## Product Overview

### Brief Description
ClipForge is a native desktop video editing application that enables creators to record, edit, and export professional-quality videos without leaving the app. Built for speed and simplicity, it combines screen recording, webcam capture, timeline-based editing, and video export into a streamlined, accessible interface.

### Problem Statement
Modern content creators need fast, intuitive video editing tools. While web-based tools exist, they lack the performance and capabilities of native applications. Professional desktop editors like Premiere Pro and Final Cut Pro have steep learning curves and are overkill for many use cases. ClipForge bridges this gap—providing desktop-grade performance with mobile-app simplicity.

### Target Users
- Content creators producing tutorials, courses, and social media content
- Professionals recording demos, presentations, and documentation
- Educators creating instructional videos
- Anyone needing quick screen recordings with basic editing

### Success Criteria
- **MVP Gate (Tuesday 10:59 PM CT)**: Functional desktop app with import, timeline view, preview, trim, and export capabilities
- **Final Submission (Wednesday 10:59 PM CT)**: Full-featured editor with screen recording, webcam capture, multi-track timeline, and export functionality
- **Performance**: Timeline remains responsive with 10+ clips, preview at 30+ fps, app launch under 5 seconds
- **Quality**: Exported videos maintain source quality without bloat, no memory leaks during 15+ minute sessions

## Functional Requirements

### 1. Recording Features

#### Screen Recording
- Capture full screen or specific windows/displays
- Use system APIs for high-quality capture:
  - macOS: AVFoundation via Tauri commands
  - Windows: Windows.Graphics.Capture via Tauri commands
  - Fallback: getDisplayMedia() web API
- Support standard resolutions (720p, 1080p, 4K if source supports)
- Real-time preview during recording
- Stop/pause controls
- Save recording directly to timeline or media library

#### Webcam Recording
- Access system camera via getUserMedia()
- Select from available cameras if multiple exist
- Preview before recording
- Record video with synchronized audio
- Save to timeline or media library

#### Simultaneous Recording
- Record screen + webcam simultaneously
- Picture-in-picture composition (webcam overlay on screen)
- Configure webcam position (corners) and size
- Both streams synchronized and saved as separate tracks

#### Audio Capture
- Microphone audio via getUserMedia()
- Select audio input device
- Visual audio level indicator during recording
- Synchronized with video stream

#### Recording Controls
- Start/stop recording with clear visual feedback
- Recording timer showing elapsed time
- Automatic save to media library on stop
- Add recordings directly to timeline

### 2. Import & Media Management

#### File Import
- Drag and drop video files onto app window
- File picker dialog for importing from disk
- Supported formats: MP4, MOV, WebM (primary), plus common formats FFmpeg can decode
- Import multiple files simultaneously
- Validate files on import (check format, corruption)

#### Media Library Panel
- Grid or list view of imported clips
- Thumbnail preview for each clip (generated from first frame or middle frame)
- Metadata display:
  - Duration (HH:MM:SS.mmm)
  - Resolution (e.g., 1920x1080)
  - File size (KB/MB/GB)
  - Format/codec
  - FPS
- Search/filter clips by name
- Delete clips from library
- Persistent storage in SQLite database

#### Media Organization
- Media library persists across sessions
- Associate clips with projects (future enhancement)
- Re-import missing files if moved
- Handle relative paths for portability

### 3. Timeline Editor

#### Timeline Interface
- Horizontal timeline with time ruler (shows timestamps)
- Visual playhead (vertical line indicating current time)
- Zoom controls (in/out) for precision editing
- Pan/scroll horizontally through timeline
- Multi-track layout:
  - Track 1: Primary video track
  - Track 2: Overlay/PiP track
  - Additional tracks for future expansion

#### Clip Management
- Drag clips from media library onto timeline
- Drag clips between positions on timeline
- Arrange clips in sequence
- Delete clips from timeline (Del/Backspace key)
- Visual representation showing clip duration and thumbnails

#### Editing Operations
- **Trim**: Adjust clip start/end points by dragging edges
  - In-point (start time within source clip)
  - Out-point (end time within source clip)
  - Visual feedback during trim
  - Snap to frame boundaries
- **Split**: Cut clip at playhead position into two separate clips
- **Delete**: Remove clip from timeline, shift subsequent clips left
- **Move**: Drag clips to new positions
- **Snap-to-edge**: Clips snap to adjacent clip edges or grid intervals
- **Select**: Click to select clip (highlight border), multi-select with Ctrl/Cmd

#### Timeline Navigation
- Click timeline ruler to move playhead
- Drag playhead to scrub through video
- Play/pause with spacebar
- Frame-by-frame navigation (arrow keys)
- Jump to start/end (Home/End keys)
- Zoom in/out (Ctrl+scroll or zoom controls)

### 4. Preview & Playback

#### Video Preview
- Real-time composition preview of timeline
- Preview window shows frame at playhead position
- Renders all visible tracks (composites overlays)
- Updates immediately when clips moved/trimmed

#### Playback Controls
- Play/pause button (spacebar)
- Stop button (return to start)
- Playhead scrubbing (drag to any position)
- Time display (current time / total duration)
- Playback speed controls (future enhancement: 0.5x, 1x, 2x)

#### Audio Playback
- Audio synchronized with video
- Mix multiple audio tracks
- Visual waveform display on timeline clips (future enhancement)
- Volume controls per-clip (future enhancement)

#### Performance Optimization
- Maintain 30+ fps during playback
- Use hardware acceleration where available
- Decode frames efficiently (consider decode-ahead buffer)
- Handle dropped frames gracefully

### 5. Export & Sharing

#### Export Configuration
- Output format: MP4 (H.264 video, AAC audio)
- Resolution options:
  - Match source resolution
  - 720p (1280x720)
  - 1080p (1920x1080)
  - Custom resolution
- Frame rate: Match source or specify (24, 30, 60 fps)
- Quality/bitrate selection (Low, Medium, High, Custom)

#### Export Process
- Export button with clear "Export Video" call-to-action
- File picker to choose save location and filename
- Progress indicator:
  - Percentage complete (0-100%)
  - Estimated time remaining
  - Current operation (processing, encoding, finalizing)
- Cancel option to abort export
- Notification/alert on completion

#### Export Implementation
- Use FFmpeg to stitch clips and encode final video
- Apply trim points, transitions, overlays
- Concatenate clips in timeline order
- Render effects and overlays (PiP)
- Generate efficient, non-bloated files

#### Bonus: Cloud Upload
- Optional: Upload exported video to Google Drive/Dropbox
- Generate shareable link
- Upload progress indicator

## Technical Requirements

### Technology Stack

#### Desktop Framework
- **Tauri 1.x/2.x**: Rust-based desktop framework
  - Smaller bundle size (~15-20MB vs Electron's 150MB+)
  - Faster startup and runtime performance
  - Rust backend for native system access
  - Web-based frontend rendering

#### Frontend Framework
- **Preact**: Lightweight React alternative (3KB)
  - React-compatible API for familiar development
  - Smaller bundle than React while maintaining convenience
  - Fast rendering performance
  - Compatible with React ecosystem libraries

#### Timeline UI
- **Konva.js**: Canvas-based rendering library
  - High performance for complex timeline rendering
  - Built-in object model for clips (drag, resize, events)
  - Easier than raw Canvas API
  - Scales well with 10+ clips

#### Media Processing
- **FFmpeg**: Industry-standard video/audio processing
  - Decode input formats (MP4, MOV, WebM, etc.)
  - Encode output (H.264 MP4)
  - Trim, concatenate, overlay operations
  - Extract frames for thumbnails
  - Embedded FFmpeg binary (via Tauri side-loading or @ffmpeg/ffmpeg)

#### Database
- **SQLite**: Embedded database via Tauri
  - Store media library metadata
  - Store project files (timeline state, clip references)
  - Store user settings
  - No server required, portable database file

#### Video Player
- **HTML5 `<video>` element**: Native video playback
  - Fast, hardware-accelerated
  - Standard web API
  - Good format support
  - Easy integration with preview system

### Architecture

#### Frontend Architecture
- **Component structure**:
  - `App`: Root component, routing, global state
  - `MediaLibrary`: Grid/list of imported clips
  - `Timeline`: Konva-based timeline editor
  - `PreviewPlayer`: Video preview window
  - `RecordingControls`: Screen/webcam recording UI
  - `ExportDialog`: Export configuration and progress
- **State management**: Preact hooks (useState, useReducer, useContext) or lightweight state library (Zustand, Valtio)
- **Styling**: Tailwind CSS or CSS Modules for scoped styles

#### Backend Architecture (Tauri Rust)
- **Commands** (Rust functions invoked from frontend):
  - `import_video(path)`: Import video file, extract metadata, generate thumbnail
  - `get_media_library()`: Query all media from SQLite
  - `delete_media(id)`: Remove media from library
  - `start_screen_recording(options)`: Start screen capture
  - `start_webcam_recording(options)`: Start webcam capture
  - `stop_recording()`: Stop recording, save file
  - `export_video(timeline, settings)`: Run FFmpeg export process
  - `get_export_progress()`: Poll export progress
- **Database layer**: SQLite via `rusqlite` or `sqlx`
  - Tables: `media` (id, path, duration, resolution, size, thumbnail_path, created_at)
  - Tables: `projects` (id, name, timeline_json, created_at, updated_at)
- **File system**: Access local files, manage temp files for recordings
- **FFmpeg integration**: Execute FFmpeg CLI or use Rust bindings

#### Data Flow
1. **Import**: User drags file → Frontend calls `import_video()` → Backend extracts metadata, saves to DB → Frontend updates media library
2. **Timeline Edit**: User drags clip → Frontend updates Konva objects → State updated in memory
3. **Preview**: Playhead moves → Frontend calculates which clip(s) visible → Updates `<video>` element source/currentTime
4. **Export**: User clicks export → Frontend sends timeline JSON + settings to backend → Backend runs FFmpeg → Frontend polls progress → Completion notification

### Integration Points

#### External Services (Optional)
- **Google Drive API**: OAuth2 authentication, upload video file
- **Dropbox API**: OAuth2 authentication, upload video file
- **Analytics** (if desired): Track feature usage, errors

#### System APIs
- **macOS AVFoundation**: Screen/window capture via Tauri Rust commands
- **Windows Graphics.Capture**: Screen capture via Tauri Rust commands
- **getUserMedia/getDisplayMedia**: Webcam and fallback screen capture (web API)

### Performance Requirements

- **App Launch**: Under 5 seconds from click to usable interface
- **Timeline Responsiveness**: Smooth drag/drop with 10+ clips (60 fps UI)
- **Preview Playback**: 30+ fps minimum, ideally 60 fps
- **Export Speed**: Real-time or faster (1-minute video exports in ≤60 seconds)
- **Memory**: No leaks during 15+ minute sessions, reasonable memory usage (< 1GB for typical project)
- **File Size**: Exported videos maintain quality without bloat (comparable to source bitrate)

### Security and Privacy

- **File Access**: Only access files user explicitly imports or chooses
- **Permissions**: Request camera/microphone permissions only when needed
- **Data Storage**: Store media references (paths), not full video files in database
- **No Telemetry**: No data collection unless user opts in

### Data Persistence

- **Project Files**: Save timeline state (clip arrangements, trim points, effects) as JSON in SQLite
- **Media Library**: Persist imported media metadata in SQLite
- **Settings**: User preferences (default export quality, shortcuts) in SQLite or config file
- **Auto-save**: Periodically save project state to prevent data loss (future enhancement)

## Non-Functional Requirements

### Scalability
- Support timelines with 20+ clips without performance degradation
- Handle video files up to 4K resolution
- Support videos up to 2 hours duration per clip

### Reliability and Availability
- Graceful error handling (corrupted files, missing codecs, disk full)
- Auto-save project state every 2 minutes
- Crash recovery: reload last saved state on restart
- No data loss during export failures (preserve source files)

### Platform Compatibility
- **Primary**: Windows 10/11 and macOS 11+
- **Testing**: Test on both platforms if possible
- **Native Features**: Use platform-specific APIs where beneficial (AVFoundation on macOS, WGC on Windows)

### Accessibility
- Keyboard shortcuts for all major actions (spacebar, arrow keys, Del, Ctrl+Z)
- Clear visual feedback (hover states, selection highlights)
- Adequate color contrast for UI elements
- Future: Screen reader support, keyboard-only navigation

### Usability
- Intuitive UI: Users should import, edit, and export within 5 minutes without a tutorial
- Clear labels and tooltips for actions
- Undo/redo support (future enhancement)
- Responsive UI: No blocking operations on main thread

## Acceptance Criteria

### MVP Gate (Tuesday 10:59 PM CT)
- [ ] Tauri desktop app launches successfully
- [ ] User can import video files (drag & drop or file picker) in MP4/MOV format
- [ ] Timeline view displays imported clips with visual representation
- [ ] Video preview player plays imported clips
- [ ] User can trim a single clip (set in/out points)
- [ ] User can export timeline to MP4 file
- [ ] App is built and packaged as native application (not dev mode)

### Final Submission (Wednesday 10:59 PM CT)
- [ ] Screen recording (full screen or window selection) works
- [ ] Webcam recording works and saves to timeline
- [ ] Simultaneous screen + webcam recording works (picture-in-picture)
- [ ] Audio capture from microphone works and synchronizes
- [ ] Multiple video files can be imported and arranged on timeline
- [ ] Timeline supports dragging, trimming, splitting, and deleting clips
- [ ] Timeline has multiple tracks (at least 2)
- [ ] Zoom and pan controls work on timeline
- [ ] Real-time preview plays timeline composition correctly
- [ ] Playback controls (play, pause, scrub) work reliably
- [ ] Export to MP4 with resolution options (720p, 1080p, source)
- [ ] Export shows progress indicator and completes without crashes
- [ ] Media library panel shows thumbnails and metadata
- [ ] App performs well: timeline responsive with 10+ clips, preview at 30+ fps, launch under 5s
- [ ] Exported videos are high quality and not bloated
- [ ] GitHub repository with README, architecture docs, and setup instructions
- [ ] Demo video (3-5 minutes) showing all core features
- [ ] Packaged desktop app available for download or with build instructions

## Out of Scope

The following features are explicitly **not included** in this 72-hour sprint to prevent scope creep:

- Advanced video effects (color grading, chroma key, blur, etc.)
- Animated text overlays with custom fonts
- Complex transitions (anything beyond cut or simple fade)
- Audio editing (volume envelopes, fade curves, equalizer)
- Multi-user collaboration or cloud projects
- Mobile app version
- Plugin architecture or third-party extensions
- Advanced export formats (ProRes, AVI, etc.)
- Live streaming capabilities
- AI-powered features (auto-captions, scene detection, etc.)
- Template library or pre-built project templates
- Social media direct uploads (YouTube, TikTok, Instagram APIs)
- Advanced project management (folders, tags, search)
- Multi-language support (localization)
- Custom keyboard shortcut configuration

These features can be considered for future iterations after the initial launch.

## Project Timeline

- **Monday, October 27th**: Project start, planning, and initial setup
- **Tuesday, October 28th, 10:59 PM CT**: MVP checkpoint (hard gate)
- **Wednesday, October 29th, 10:59 PM CT**: Final submission deadline
- **Thursday, October 30th**: Relocation to Austin

**Total development time: 72 hours**

This is an aggressive timeline. Focus relentlessly on the core loop: **Record → Import → Arrange → Export**. A simple, working video editor beats a feature-rich app that crashes.
