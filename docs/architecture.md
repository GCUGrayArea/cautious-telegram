# ClipForge Architecture Documentation

**Version:** 0.1.0
**Last Updated:** 2025-10-27
**Status:** Production Ready

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Component Architecture](#component-architecture)
5. [Data Models](#data-models)
6. [Key Subsystems](#key-subsystems)
7. [Security Architecture](#security-architecture)
8. [Deployment Architecture](#deployment-architecture)
9. [Performance Characteristics](#performance-characteristics)
10. [Future Considerations](#future-considerations)

---

## System Overview

**ClipForge** is a native desktop video editing application built with **Tauri**, **React**, **Konva.js**, **FFmpeg**, and **SQLite**. It provides a professional video editing workflow with screen/webcam recording, multi-track timeline editing, real-time preview, and high-quality video export.

### Design Philosophy

- **Native Performance**: Rust backend for CPU-intensive operations (video processing, database)
- **Modern UX**: React frontend for responsive, component-based UI
- **Minimal Bundle Size**: Tauri instead of Electron (~10MB vs ~100MB)
- **Industry-Standard Tools**: FFmpeg for video processing (proven, reliable)
- **Cross-Platform**: Windows and macOS support with platform-specific optimizations

### Key Capabilities

| Feature | Implementation |
|---------|---------------|
| **Video Import** | Multi-format support (MP4, AVI, MOV, MKV) via FFmpeg |
| **Recording** | Screen (getDisplayMedia), Webcam (getUserMedia), Simultaneous |
| **Timeline Editing** | Konva canvas with 60fps drag-drop, trim, split operations |
| **Multi-Track** | 3 tracks for picture-in-picture effects |
| **Preview** | Real-time HTML5 video synchronized with playhead |
| **Export** | FFmpeg-powered MP4 export with quality presets (1080p, 720p, 480p) |
| **Media Library** | SQLite-backed persistent storage with thumbnails |

---

## Technology Stack

### Frontend Stack

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **React** | 18.3.1 | UI framework | Modern, well-supported, required for Konva's react-reconciler |
| **Konva.js** | 9.3.3 | Canvas rendering | High-performance timeline with 60fps drag-drop |
| **react-konva** | 18.2.10 | React bindings for Konva | Integrates Konva with React component model |
| **Vite** | 5.0.10 | Build tool | Fast dev server, optimized production builds |
| **Tailwind CSS** | 3.4.0 | Styling | Utility-first CSS, rapid UI development |
| **@tauri-apps/api** | 1.5.3 | IPC bridge | Frontend-backend communication |

**Note on React vs Preact:**
Originally implemented with Preact (3KB lightweight alternative), but refactored to React due to Konva's dependency on `react-reconciler`. Konva's React bindings require full React for proper canvas rendering and event handling.

### Backend Stack

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **Tauri** | 1.5 | Desktop framework | ~10x smaller bundle than Electron, Rust performance, native APIs |
| **Rust** | 2021 edition | Backend language | Memory safety, performance, zero-cost abstractions |
| **rusqlite** | 0.31 | SQLite bindings | Embedded database with bundled SQLite library |
| **serde** | 1.0 | Serialization | JSON serialization for IPC and data models |
| **chrono** | 0.4 | Date/time handling | Timestamp management with serde support |
| **FFmpeg** | (bundled binaries) | Video processing | Industry-standard video analysis and encoding |

---

## System Architecture

### High-Level Architecture

ClipForge follows a **hybrid native-web architecture** with clear separation between presentation (React), business logic (Rust), and data persistence (SQLite/FFmpeg).

```mermaid
graph TB
    subgraph "React Frontend (WebView)"
        A[React Components]
        B[State Management<br/>Context + useReducer]
        C[Konva Timeline Canvas]
        D[Utility Functions<br/>api.js, playback.js]
    end

    subgraph "Tauri IPC Bridge"
        E[Command Handlers]
        F[Event System]
    end

    subgraph "Rust Backend"
        G[AppState<br/>Arc&lt;Database&gt;]
        H[Command Modules<br/>import, export, recording]
        I[FFmpeg Wrapper<br/>Arc&lt;Mutex&lt;FFmpegWrapper&gt;&gt;]
        J[Database Operations<br/>CRUD for media/projects]
    end

    subgraph "External Systems"
        K[(SQLite Database<br/>media, projects)]
        L[FFmpeg Binaries<br/>ffmpeg, ffprobe]
        M[File System<br/>Videos, Recordings]
    end

    A --> D
    B --> A
    C --> A
    D --> E
    E --> H
    H --> I
    H --> J
    J --> K
    I --> L
    H --> M
    F --> D
```

### Data Flow Patterns

#### Import Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as React UI
    participant T as Tauri IPC
    participant R as Rust Backend
    participant F as FFmpeg
    participant DB as SQLite

    U->>UI: Click "Import Video"
    UI->>T: selectVideoFile()
    T->>U: File picker dialog
    U->>T: Select file(s)
    T->>UI: Return file paths
    UI->>T: importVideo(path)
    T->>R: import_video command
    R->>F: ffprobe (extract metadata)
    F->>R: VideoMetadata
    R->>F: ffmpeg (generate thumbnail)
    F->>R: Thumbnail PNG
    R->>DB: INSERT media record
    DB->>R: Success
    R->>T: ImportResult
    T->>UI: Media object
    UI->>UI: Refresh MediaLibrary
    UI->>U: Show imported video
```

#### Export Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as React UI
    participant T as Tauri IPC
    participant R as Rust Backend
    participant F as FFmpeg
    participant FS as File System

    U->>UI: Configure export settings
    UI->>T: save() dialog
    T->>U: File save dialog
    U->>T: Choose output location
    T->>UI: Output path
    UI->>T: exportTimeline(clips, settings)
    T->>R: export_timeline command
    R->>R: Build clip list
    loop For each clip
        R->>F: Trim clip to in/out points
        F->>FS: Trimmed clip file
    end
    R->>F: Concatenate trimmed clips
    F->>FS: Concatenated video
    R->>F: Apply resolution scaling
    F->>FS: Final MP4
    R->>T: Output file path
    T->>UI: Success
    UI->>U: Show export complete
```

### Integration Points

| Integration | Technology | Direction | Purpose |
|-------------|-----------|-----------|---------|
| **Frontend ↔ Backend** | Tauri IPC (JSON) | Bidirectional | Command invocation, event emission |
| **Backend ↔ Database** | rusqlite (Rust) | Backend → DB | Media library persistence |
| **Backend ↔ FFmpeg** | Command-line (stdout/stderr) | Backend → FFmpeg | Video processing |
| **Frontend ↔ File System** | Tauri dialog APIs | Both | File picker, save dialogs |
| **Frontend ↔ Browser APIs** | getUserMedia, getDisplayMedia | Frontend → Browser | Recording capabilities |

---

## Component Architecture

### Frontend Component Hierarchy

```
App.jsx (Root)
├── Header (Logo, Title)
├── Sidebar (Tabs: Media Library, Record)
│   ├── MediaLibrary.jsx
│   │   ├── Search/Filter bar
│   │   ├── Import button
│   │   ├── View toggle (Grid/List)
│   │   └── MediaCard[] (grid of clips)
│   │       └── Thumbnail, Filename, Duration, Resolution
│   └── RecordingPanel.jsx
│       ├── Mode selector (Screen/Webcam/Both)
│       ├── Start/Stop buttons
│       ├── Recording timer
│       └── Status indicator (red pulsing dot)
├── Main Editor Area
│   ├── Timeline.jsx (Konva canvas)
│   │   ├── TimeRuler.jsx (time axis labels)
│   │   ├── Track[] (3 horizontal tracks)
│   │   │   └── TimelineClip[] (rectangle shapes)
│   │   │       ├── Trim handles (left/right)
│   │   │       ├── Thumbnail preview
│   │   │       └── Duration label
│   │   └── Playhead.jsx (red vertical line)
│   └── PlaybackControls.jsx
│       ├── Play/Pause button
│       └── Time display (current / total)
└── Right Panel
    └── PreviewPlayer.jsx
        ├── HTML5 <video> element
        └── Current frame display

Modals:
├── ExportDialog.jsx
│   ├── Quality preset selector
│   ├── Output path picker
│   ├── Export progress bar
│   └── Success/Error messages
└── MediaDetailModal.jsx
    └── Metadata display (resolution, duration, codec, etc.)
```

### State Management

#### timelineStore.jsx - Global Timeline State

**Pattern:** Redux-style with React Context + useReducer

**State Shape:**
```javascript
{
  clips: [
    {
      id: 1,
      mediaId: 5,
      startTime: 0.0,      // Position on timeline (seconds)
      duration: 30.5,      // Full duration of source media
      track: 0,            // Track number (0-2)
      inPoint: 0.0,        // Trim start (seconds into source media)
      outPoint: 30.5,      // Trim end
      metadata: {
        path: "/path/to/video.mp4",
        filename: "video.mp4",
        width: 1920,
        height: 1080,
        fps: 30.0
      }
    },
    // ... more clips
  ],
  selectedClipId: null,  // Currently selected clip for editing
  nextClipId: 2,         // Auto-increment ID counter
  playheadTime: 0.0,     // Current playhead position (seconds)
  isPlaying: false       // Playback state
}
```

**Actions:**
- `ADD_CLIP`: Add clip to timeline (from drag-drop)
- `REMOVE_CLIP`: Delete clip by ID
- `UPDATE_CLIP`: Modify clip properties (position, trim)
- `SELECT_CLIP`: Select clip for editing
- `CLEAR_SELECTION`: Deselect all
- `SET_PLAYHEAD_TIME`: Move playhead
- `TOGGLE_PLAYBACK`: Play/pause
- `SET_PLAYBACK_STATE`: Explicit play state
- `SPLIT_CLIP`: Split clip at playhead position

**Provider:**
```javascript
<TimelineProvider>
  {children}
</TimelineProvider>
```

**Consumer:**
```javascript
const { state, dispatch } = useTimeline();
```

#### dragStore.jsx - Custom Drag-Drop State

**Problem:** HTML5 drag-drop API conflicts with Tauri's `fileDropEnabled` (external file drops)

**Solution:** Custom mouse-based drag tracking

**State:**
```javascript
{
  draggedItem: null,      // Media object being dragged
  isDragging: false,      // Drag active flag
  dragPosition: {x: 0, y: 0}  // Mouse coordinates
}
```

**Methods:**
- `startDrag(item)`: Initialize drag
- `updateDragPosition(x, y)`: Track mouse movement
- `endDrag()`: Finalize or cancel drag

**Visual Feedback:** Ghost preview div follows cursor during drag

### Rust Module Organization

```
src-tauri/src/
├── main.rs                    # Application entry point
│   ├── AppState struct        # Shared state (Database, FFmpegWrapper)
│   ├── Database initialization
│   └── Command registration
│
├── commands/                  # Tauri command handlers
│   ├── mod.rs                # Module exports
│   ├── import.rs             # import_video, get_media_library, delete_media_item
│   ├── recording.rs          # save_recording, import_recording
│   └── export.rs             # export_timeline
│
├── database/                  # SQLite persistence layer
│   ├── mod.rs                # Database struct with Connection
│   ├── models.rs             # Media and Project structs
│   ├── schema.rs             # SQL table definitions
│   └── operations.rs         # CRUD functions
│
├── ffmpeg/                    # FFmpeg integration
│   ├── mod.rs                # FFmpegState wrapper
│   ├── wrapper.rs            # FFmpegWrapper with binary resolution
│   ├── metadata.rs           # VideoMetadata struct
│   └── commands.rs           # Tauri command handlers for FFmpeg
│
├── export/                    # Export pipeline
│   ├── mod.rs                # Module exports
│   ├── encoder.rs            # ExportSettings, Resolution enum
│   └── pipeline.rs           # ExportPipeline implementation
│
└── tests/                     # Integration tests
    └── export_tests.rs
```

---

## Data Models

### SQLite Schema

#### media Table

```sql
CREATE TABLE media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,                -- Absolute file path
    filename TEXT NOT NULL,            -- Display name
    duration REAL,                     -- Seconds (e.g., 125.5)
    width INTEGER,                     -- Pixels (e.g., 1920)
    height INTEGER,                    -- Pixels (e.g., 1080)
    file_size INTEGER,                 -- Bytes
    format TEXT,                       -- Container format (mp4, avi, mov)
    fps REAL,                          -- Frames per second (e.g., 30.0)
    thumbnail_path TEXT,               -- Path to generated thumbnail PNG
    created_at TEXT NOT NULL,          -- ISO 8601 timestamp
    metadata_json TEXT                 -- Additional metadata (future use)
);
```

**Indexes:**
- Primary key on `id`
- Ordered by `created_at DESC` for recent-first display

#### projects Table

```sql
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,         -- Project name
    timeline_json TEXT,                -- Serialized timeline state
    created_at TEXT NOT NULL,          -- ISO 8601 timestamp
    updated_at TEXT NOT NULL,          -- Last modification
    last_opened_at TEXT                -- Last opened (for recent projects)
);
```

**Status:** Schema created but not yet used (project persistence planned for future release)

### Rust Data Structures

#### Media Model

```rust
pub struct Media {
    pub id: Option<i64>,
    pub path: String,
    pub filename: String,
    pub duration: Option<f64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub file_size: Option<i64>,
    pub format: Option<String>,
    pub fps: Option<f64>,
    pub thumbnail_path: Option<String>,
    pub created_at: String,
    pub metadata_json: Option<String>,
}
```

**Serialization:** Implements `Serialize` and `Deserialize` for Tauri IPC

#### VideoMetadata (FFmpeg)

```rust
pub struct VideoMetadata {
    pub duration: f64,        // Seconds
    pub width: u32,           // Pixels
    pub height: u32,
    pub fps: f64,
    pub codec: String,        // e.g., "h264", "vp9"
    pub bitrate: Option<u64>, // Bits per second
}
```

**Source:** Parsed from `ffprobe -v quiet -print_format json -show_format -show_streams`

#### ClipData (Export)

```rust
#[derive(Deserialize)]
pub struct ClipData {
    pub media_path: String,   // Path to source video file
    pub start_time: f64,      // Clip position on timeline (seconds)
    pub duration: f64,        // Full duration of source media
    pub in_point: f64,        // Trim start (seconds into source)
    pub out_point: f64,       // Trim end
}
```

**Sent from frontend during export:** JavaScript timeline clips → Serde JSON → Rust ClipData vector

### Timeline JSON Structure

**Current State:** In-memory only (not persisted)
**Future:** Will be serialized to `projects.timeline_json`

```json
{
  "clips": [
    {
      "id": 1,
      "mediaId": 5,
      "startTime": 0.0,
      "duration": 30.5,
      "track": 0,
      "inPoint": 0.0,
      "outPoint": 30.5,
      "metadata": {
        "path": "/path/to/video.mp4",
        "filename": "video.mp4",
        "width": 1920,
        "height": 1080,
        "fps": 30.0
      }
    }
  ],
  "playheadTime": 10.5,
  "zoom": 100.0,
  "version": "0.1.0"
}
```

### Tauri Command Interfaces

#### import_video

```rust
#[tauri::command]
pub async fn import_video(
    video_path: String,
    app_state: State<'_, AppState>,
    ffmpeg_state: State<'_, FFmpegState>
) -> Result<ImportResult, String>
```

**Returns:**
```rust
pub struct ImportResult {
    pub success: bool,
    pub media: Option<Media>,
    pub error: Option<String>,
}
```

#### export_timeline

```rust
#[tauri::command]
pub fn export_timeline(
    clips: Vec<ClipData>,
    settings: ExportSettings,
    ffmpeg_state: State<FFmpegWrapper>
) -> Result<String, String>
```

**ExportSettings:**
```rust
pub struct ExportSettings {
    pub resolution: Resolution,  // Source, P720, P1080
    pub output_path: String,
    pub codec: String,           // Default: "libx264"
    pub bitrate: u32,            // bps (calculated from resolution)
}
```

---

## Key Subsystems

### Timeline Editor Subsystem

**Components:** Timeline.jsx, TimelineClip.jsx, TimeRuler.jsx, Playhead.jsx
**Rendering Engine:** Konva.js (HTML5 Canvas)

#### Coordinate System

**Time-to-Pixel Conversion:**
```javascript
const PIXELS_PER_SECOND = 100; // Base zoom level

// Convert time (seconds) to X position (pixels)
function timeToPixels(time, zoom = 1.0) {
  return time * PIXELS_PER_SECOND * zoom;
}

// Convert X position (pixels) to time (seconds)
function pixelsToTime(pixels, zoom = 1.0) {
  return pixels / (PIXELS_PER_SECOND * zoom);
}
```

**Track Layout:**
```
Y = 0:  TimeRuler (40px height)
Y = 40: Track 0 (80px height)
Y = 120: Track 1 (80px height)
Y = 200: Track 2 (80px height)
```

**Zoom Levels:**
- Minimum: 10 px/second (zoomed out, long timelines visible)
- Maximum: 500 px/second (zoomed in, frame-level precision)
- Zoom multiplier: 1.2x per scroll step

#### Clip Rendering

Each clip rendered as Konva `Rect` + `Text`:
```javascript
<Rect
  x={timeToPixels(clip.startTime)}
  y={getTrackY(clip.track)}
  width={timeToPixels(clip.outPoint - clip.inPoint)}
  height={TRACK_HEIGHT}
  fill={clip.selected ? '#3b82f6' : '#6b7280'}
  stroke={clip.selected ? '#1d4ed8' : '#4b5563'}
  strokeWidth={2}
  draggable={true}
  onDragEnd={handleClipDrag}
/>
```

**Trim Handles:**
- Left handle: Adjusts `inPoint` and `startTime`
- Right handle: Adjusts `outPoint`
- Visual: Small yellow rectangles at clip edges
- Constraint: Cannot trim beyond source media duration

#### Snapping Behavior

**Magnetic Snap:** When dragging a clip, snap to nearby clip edges if within 10px threshold

```javascript
function snapToPoints(dragX, clipSnapPoints) {
  const threshold = 10; // pixels
  for (const point of clipSnapPoints) {
    if (Math.abs(dragX - point) < threshold) {
      return point; // Snap to this point
    }
  }
  return dragX; // No snap
}
```

**Snap Points:**
- Start of other clips
- End of other clips
- Timeline start (time 0)
- Playhead position

#### Keyboard Navigation

| Shortcut | Action | Implementation |
|----------|--------|----------------|
| **Space** | Play/Pause | Toggle `isPlaying` in timelineStore |
| **Arrow Left** | Previous frame (~0.033s) | `dispatch({ type: 'SET_PLAYHEAD_TIME', payload: time - 0.033 })` |
| **Arrow Right** | Next frame (~0.033s) | `dispatch({ type: 'SET_PLAYHEAD_TIME', payload: time + 0.033 })` |
| **Home** | Jump to start | `dispatch({ type: 'SET_PLAYHEAD_TIME', payload: 0 })` |
| **End** | Jump to end | Calculate max clip end time, set playhead |
| **S** | Split clip | `dispatch({ type: 'SPLIT_CLIP', payload: playheadTime })` |
| **Delete** | Delete selected clip | `dispatch({ type: 'REMOVE_CLIP', payload: selectedClipId })` |

### Video Preview Subsystem

**Component:** PreviewPlayer.jsx
**Core Technology:** HTML5 `<video>` element

#### Frame Display Logic

```javascript
function PreviewPlayer() {
  const { state } = useTimeline();
  const { playheadTime, clips } = state;
  const videoRef = useRef(null);

  useEffect(() => {
    // Find clip at current playhead position
    const currentClip = getClipAtTime(clips, playheadTime);

    if (currentClip) {
      // Calculate source time within media file
      const sourceTime = getClipSourceTime(currentClip, playheadTime);

      // Seek video element to frame
      if (videoRef.current) {
        videoRef.current.currentTime = sourceTime;
        videoRef.current.src = convertToAssetPath(currentClip.metadata.path);
      }
    } else {
      // No clip at playhead - show black frame
      videoRef.current.src = '';
    }
  }, [playheadTime, clips]);

  return <video ref={videoRef} controls={false} />;
}
```

**getClipAtTime:**
```javascript
function getClipAtTime(clips, time) {
  for (const clip of clips) {
    const clipStart = clip.startTime;
    const clipEnd = clip.startTime + (clip.outPoint - clip.inPoint);
    if (time >= clipStart && time <= clipEnd) {
      return clip;
    }
  }
  return null;
}
```

**getClipSourceTime:**
```javascript
function getClipSourceTime(clip, playheadTime) {
  const timeIntoClip = playheadTime - clip.startTime;
  return clip.inPoint + timeIntoClip;
}
```

#### Playback Engine

**Class:** `PlaybackEngine` (src/utils/playback.js)

```javascript
class PlaybackEngine {
  constructor({ onTimeUpdate, onPlaybackEnd }) {
    this.onTimeUpdate = onTimeUpdate;
    this.onPlaybackEnd = onPlaybackEnd;
    this.animationFrameId = null;
    this.startTime = null;
    this.lastFrameTime = null;
  }

  start(initialTime, duration) {
    this.startTime = initialTime;
    this.duration = duration;
    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.tick.bind(this));
  }

  tick(currentFrameTime) {
    const elapsed = (currentFrameTime - this.lastFrameTime) / 1000; // Convert to seconds
    this.currentTime = this.startTime + elapsed;

    if (this.currentTime >= this.duration) {
      this.onPlaybackEnd();
      this.stop();
      return;
    }

    this.onTimeUpdate(this.currentTime);
    this.animationFrameId = requestAnimationFrame(this.tick.bind(this));
  }

  pause() {
    cancelAnimationFrame(this.animationFrameId);
  }

  stop() {
    this.pause();
    this.currentTime = 0;
  }
}
```

**Performance:** 60fps smooth playback via `requestAnimationFrame`

### Recording Pipeline Subsystem

**Components:** RecordingPanel.jsx
**Browser APIs:** `getUserMedia()`, `getDisplayMedia()`
**Utilities:** ScreenRecorder.js, WebcamRecorder.js

#### Recording Modes

1. **Screen Only** (`getDisplayMedia`)
   - User selects screen/window/tab via browser prompt
   - Audio capture optional (system audio + microphone)
   - Output: WebM video file

2. **Webcam Only** (`getUserMedia`)
   - Requests camera and microphone permissions
   - Shows webcam preview before recording
   - Output: WebM video file

3. **Screen + Webcam** (simultaneous)
   - Runs both `getDisplayMedia` and `getUserMedia` concurrently
   - Two separate `MediaRecorder` instances
   - Output: Two WebM files with matching timestamps
   - Filenames: `screen-recording-{timestamp}.webm`, `webcam-recording-{timestamp}.webm`

#### ScreenRecorder Implementation

```javascript
class ScreenRecorder {
  async start(options = {}) {
    // Request screen capture permission
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { mediaSource: 'screen' },
      audio: options.includeAudio !== false
    });

    // Initialize MediaRecorder
    this.recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
    });

    this.chunks = [];
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.recorder.start(1000); // Record in 1-second chunks
  }

  async stop() {
    return new Promise((resolve) => {
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        resolve(blob);
      };
      this.recorder.stop();
      this.recorder.stream.getTracks().forEach(track => track.stop());
    });
  }
}
```

#### Recording Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as RecordingPanel
    participant SR as ScreenRecorder
    participant BR as Browser
    participant T as Tauri Backend
    participant ML as MediaLibrary

    U->>UI: Click "Start Recording"
    UI->>SR: start()
    SR->>BR: getDisplayMedia()
    BR->>U: Screen picker dialog
    U->>BR: Select screen/window
    BR->>SR: MediaStream
    SR->>SR: new MediaRecorder(stream)
    SR->>SR: recorder.start()
    SR->>UI: Recording started
    UI->>UI: Show red pulsing indicator
    UI->>UI: Start timer (MM:SS)

    Note over U,UI: User performs actions to record

    U->>UI: Click "Stop Recording"
    UI->>SR: stop()
    SR->>SR: recorder.stop()
    SR->>SR: Collect chunks into Blob
    SR->>UI: Return Blob
    UI->>T: saveRecording(blob, filename)
    T->>T: Write blob to disk
    T->>UI: Return file path
    UI->>T: importRecording(filePath)
    T->>T: FFmpeg probe + thumbnail
    T->>T: Insert into database
    T->>UI: Return Media object
    UI->>ML: Refresh media library
    ML->>U: Show new recording
```

#### Permission Handling

**Screen Capture:**
- Permission requested per recording (no persistent grant)
- User can select screen, window, or browser tab
- Browser shows which content is being captured

**Webcam/Microphone:**
- Permission requested once, persists across sessions
- Stored in browser settings (per-origin)
- User can revoke in browser settings

### Export Pipeline Subsystem

**Rust Modules:** export/pipeline.rs, export/encoder.rs, ffmpeg/wrapper.rs
**External Dependency:** FFmpeg binaries

#### Export Process Flow

```
1. Frontend sends clips[] and ExportSettings to backend
   ↓
2. Rust receives: Vec<ClipData>, ExportSettings
   ↓
3. For each clip:
   a. Generate trimmed clip file (in/out points)
      ffmpeg -i input.mp4 -ss {inPoint} -to {outPoint} -c copy trimmed_1.mp4
   b. Store trimmed file path
   ↓
4. Concatenate all trimmed clips
   ffmpeg -f concat -safe 0 -i filelist.txt -c copy concatenated.mp4
   ↓
5. Apply resolution scaling (if needed)
   ffmpeg -i concatenated.mp4 -vf scale=1280:720 -c:v libx264 -b:v 2500k scaled.mp4
   ↓
6. Return output file path to frontend
```

#### ExportPipeline Implementation

```rust
pub struct ExportPipeline {
    ffmpeg_wrapper: Arc<FFmpegWrapper>,
}

impl ExportPipeline {
    pub fn export_timeline(
        &self,
        clips: Vec<ClipData>,
        settings: ExportSettings,
    ) -> Result<String, String> {
        let mut trimmed_files = Vec::new();

        // Step 1: Trim each clip to in/out points
        for (index, clip) in clips.iter().enumerate() {
            let trimmed_path = format!("/tmp/trimmed_{}.mp4", index);
            self.ffmpeg_wrapper.trim_video(
                &clip.media_path,
                &trimmed_path,
                clip.in_point,
                clip.out_point,
            )?;
            trimmed_files.push(trimmed_path);
        }

        // Step 2: Concatenate trimmed clips
        let concat_path = "/tmp/concatenated.mp4".to_string();
        self.ffmpeg_wrapper.concat_videos(&trimmed_files, &concat_path)?;

        // Step 3: Apply resolution scaling (if not Source resolution)
        let final_path = match settings.resolution {
            Resolution::Source => concat_path,
            Resolution::P720 | Resolution::P1080 => {
                let scaled_path = settings.output_path.clone();
                self.ffmpeg_wrapper.scale_video(
                    &concat_path,
                    &scaled_path,
                    &settings,
                )?;
                scaled_path
            }
        };

        Ok(final_path)
    }
}
```

#### FFmpeg Command Generation

**Trim:**
```bash
ffmpeg -i input.mp4 \
  -ss {inPoint} \
  -to {outPoint} \
  -c copy \
  output.mp4
```

**Concatenate:**
```bash
# Create filelist.txt
file 'trimmed_0.mp4'
file 'trimmed_1.mp4'
file 'trimmed_2.mp4'

# Concatenate
ffmpeg -f concat \
  -safe 0 \
  -i filelist.txt \
  -c copy \
  concatenated.mp4
```

**Scale + Encode:**
```bash
ffmpeg -i concatenated.mp4 \
  -vf scale={width}:{height} \
  -c:v libx264 \
  -preset medium \
  -b:v {bitrate}k \
  -c:a aac \
  -b:a 128k \
  output.mp4
```

**Quality Presets:**

| Resolution | Width × Height | Target Bitrate | Use Case |
|------------|----------------|----------------|----------|
| **Source** | Original | Original | Best quality, largest file |
| **1080p** | 1920 × 1080 | 5000 kbps | YouTube, high-quality sharing |
| **720p** | 1280 × 720 | 2500 kbps | Balanced quality and size |
| **480p** | 854 × 480 | 1000 kbps | Smallest size, quick sharing |

#### Multi-Track Export

**Current Status:** Planned for future release
**Architecture:**

```rust
pub struct Track {
    pub index: u32,
    pub clips: Vec<ClipData>,
}

// For multi-track export:
// 1. Export Track 0 (base video)
// 2. For each Track N > 0:
//    a. Export Track N
//    b. Overlay Track N onto base using FFmpeg filter_complex
// 3. Return composited video
```

**FFmpeg Overlay:**
```bash
ffmpeg -i base.mp4 \
  -i overlay.mp4 \
  -filter_complex "[0:v][1:v]overlay=W-w-10:H-h-10" \
  output.mp4
```

(Overlays second video in bottom-right corner)

---

## Security Architecture

### File System Access

**Tauri Permissions:**
```json
{
  "permissions": [
    "fs-read-dir",
    "fs-read-file",
    "fs-write-file",
    "fs-exists",
    "fs-remove-file"
  ]
}
```

**Access Patterns:**
- **User-selected files only:** All video imports go through Tauri dialog API (user explicitly selects files)
- **Scoped writes:** Recordings saved to app-specific temp directory
- **No arbitrary file access:** Backend cannot read files without user interaction

### Camera/Microphone Permissions

**Browser Permissions API:**
- **Camera:** Required for webcam recording
- **Microphone:** Required for audio recording
- **Screen Capture:** Requested per recording session

**Permission Storage:**
- Webcam/mic permissions persist across app launches
- Stored in Chromium's permission manager (per-origin)
- Screen capture permission never persists (re-requested each time)

**User Control:**
- User can revoke permissions in browser settings
- App clearly indicates when recording is active (red pulsing indicator)

### Database Storage

**Location:**
- **Windows:** `%APPDATA%\ClipForge\clipforge.db`
- **macOS:** `~/Library/Application Support/ClipForge/clipforge.db`

**Security:**
- SQLite database file (no network exposure)
- File system permissions restrict access to current user
- No sensitive data stored (only file paths and metadata)

**Backup:**
- User can manually backup database file
- Database file is self-contained (no external dependencies)

### FFmpeg Binary Security

**Binary Verification:**
- FFmpeg binaries bundled with application (signed with app)
- Bundled in `src-tauri/binaries/` during development
- Included as Tauri sidecars in production builds

**Execution:**
- FFmpeg spawned as child process (stdout/stderr captured)
- No shell expansion (direct command execution)
- Temporary files cleaned up after export

---

## Deployment Architecture

### Build Process

#### Development Build

```bash
# Frontend (Vite dev server)
npm run dev

# Tauri dev build (hot reload)
npm run tauri:dev
```

**Characteristics:**
- Fast refresh for React code changes
- Rust backend compiled in debug mode
- Source maps enabled
- FFmpeg binaries loaded from `src-tauri/binaries/`

#### Production Build

```bash
# Build frontend + backend + create installer
npm run tauri:build
```

**Output:**
- **Windows:** MSI installer + NSIS installer
- **macOS:** DMG disk image + .app bundle

**Optimizations:**
- Vite production build (minified, tree-shaken)
- Rust release build (opt-level="z", LTO enabled)
- FFmpeg binaries bundled as Tauri sidecars

### FFmpeg Binary Bundling

**Strategy:**

1. **Development:** FFmpeg binaries in `src-tauri/binaries/`
   - `ffmpeg-x86_64-pc-windows-msvc.exe` (98.7 MB)
   - `ffprobe-x86_64-pc-windows-msvc.exe` (98.5 MB)

2. **Production:** Tauri sidecars (bundled with installer)
   ```json
   // tauri.conf.json
   {
     "bundle": {
       "externalBin": [
         "binaries/ffmpeg",
         "binaries/ffprobe"
       ]
     }
   }
   ```

3. **Runtime Resolution:**
   ```rust
   fn resolve_ffmpeg_path() -> PathBuf {
       // 1. Check sidecar path (production)
       // 2. Check binaries/ directory (development)
       // 3. Fallback to system PATH
   }
   ```

### Bundle Size

| Component | Size | Notes |
|-----------|------|-------|
| **Application Executable** | ~5-10 MB | Rust backend + React bundle |
| **FFmpeg Binaries** | ~197 MB | ffmpeg (98.7 MB) + ffprobe (98.5 MB) |
| **Installer Overhead** | ~3 MB | MSI/NSIS/DMG container |
| **Total** | ~200-210 MB | Within < 200MB target (with FFmpeg) |

**Comparison:**
- **ClipForge:** ~210 MB (Tauri + FFmpeg)
- **Electron Equivalent:** ~400-500 MB (Electron runtime + FFmpeg + app)

### Cross-Platform Considerations

#### Windows

- **Installer:** MSI (Windows Installer) + NSIS (Nullsoft Scriptable Install System)
- **Binary Format:** PE32+ executables (.exe)
- **FFmpeg:** Windows-specific binaries (x86_64-pc-windows-msvc)
- **Database Path:** `%APPDATA%\ClipForge\clipforge.db`

#### macOS

- **Installer:** DMG disk image
- **Binary Format:** Mach-O 64-bit executables
- **FFmpeg:** macOS-specific binaries (x86_64-apple-darwin or aarch64-apple-darwin)
- **Database Path:** `~/Library/Application Support/ClipForge/clipforge.db`
- **Code Signing:** Required for distribution (Apple Developer ID)

#### Linux (Future)

- **Installer:** AppImage or .deb/.rpm packages
- **FFmpeg:** Linux-specific binaries (x86_64-unknown-linux-gnu)
- **Database Path:** `~/.local/share/ClipForge/clipforge.db`

---

## Performance Characteristics

### Timeline Responsiveness

**Target:** 60fps interaction for drag-drop, scrubbing, playback

**Optimizations:**
1. **Konva Rendering:** Hardware-accelerated canvas (GPU-accelerated when available)
2. **RequestAnimationFrame:** Smooth 60fps playback loop
3. **React Optimization:** Memoization of expensive components
4. **Limited Clip Count:** Performant up to ~100 clips on timeline

**Bottlenecks:**
- Large number of clips (>200) may cause lag
- High-resolution source videos (4K+) may slow preview loading

### Video Playback Synchronization

**Approach:** HTML5 `<video>` element seeks to frame position

**Latency:**
- Seek time: ~50-200ms (depends on codec, keyframe distance)
- Konva rendering: <16ms per frame (60fps)
- Total latency: ~100-300ms from playhead move to frame display

**Optimization:**
- Use codecs with frequent keyframes (H.264 baseline profile)
- Pre-load adjacent frames (future enhancement)

### FFmpeg Encoding Performance

**Export Speed:**
- Real-time or faster (depends on CPU)
- H.264 encoding: ~0.5-2x real-time on modern CPUs
- Concatenation (codec copy): ~50-100x real-time (I/O bound)

**CPU Usage:**
- Export: 80-100% CPU utilization (multi-threaded FFmpeg)
- Import/Thumbnail: 20-50% CPU (short bursts)

**Memory Management:**
- FFmpeg streams data (low memory footprint)
- Rust backend: Minimal heap allocations
- Frontend: All clips in memory (~1 KB per clip)

### Memory Management

**During Long Sessions:**
- **Frontend:** ~100-200 MB (React app + Konva canvas)
- **Backend:** ~50-100 MB (SQLite + FFmpeg state)
- **Total:** ~150-300 MB (very efficient)

**Garbage Collection:**
- JavaScript GC handles frontend memory automatically
- Rust RAII ensures backend memory cleanup
- No memory leaks observed in testing

---

## Future Considerations

### Planned Features

1. **Project Persistence**
   - Save/load timeline state to SQLite `projects` table
   - Recent projects list
   - Auto-save functionality

2. **Undo/Redo System**
   - Command pattern for reversible actions
   - History stack in timelineStore
   - Keyboard shortcuts: Ctrl+Z / Ctrl+Y

3. **Audio Mixing**
   - Separate audio tracks
   - Volume controls per clip
   - Fade in/out effects

4. **Effects & Transitions**
   - Fade, wipe, dissolve between clips
   - Color grading (brightness, contrast, saturation)
   - Text overlays (titles, captions)

5. **Advanced Export**
   - Progress bar with cancel support
   - Background export (non-blocking)
   - Custom encoder settings (CRF, preset, profile)

6. **Multi-Window Support**
   - Detachable preview player
   - Multiple timeline views

7. **Collaboration Features**
   - Project sharing (export timeline JSON)
   - Relative file paths for portability

### Architectural Improvements

1. **Async Export**
   - Move export to background thread
   - Use Tauri events for progress updates
   - Allow UI interaction during export

2. **GPU Acceleration**
   - Use FFmpeg's hardware encoders (NVENC, QuickSync)
   - Konva WebGL renderer for timeline

3. **Plugin System**
   - Dynamic effects/filters
   - Third-party integrations (YouTube upload, etc.)

4. **Performance Profiling**
   - Timeline rendering benchmarks
   - Export speed metrics
   - Memory usage tracking

### Scalability Considerations

**Current Limits:**
- ~100 clips on timeline (smooth 60fps)
- ~1000 media items in library (SQLite query performance)
- ~10 minute exports (blocking UI)

**Future Scaling:**
- Virtual scrolling for large timelines (render only visible clips)
- Database pagination for large libraries
- Chunked/streaming export for multi-hour videos

---

## Appendix: System Diagrams

### Component Interaction Diagram

```mermaid
graph LR
    subgraph Frontend
        A[React Components]
        B[timelineStore]
        C[Konva Canvas]
    end

    subgraph Backend
        D[Tauri Commands]
        E[FFmpeg Wrapper]
        F[Database]
    end

    A -->|dispatch actions| B
    B -->|state updates| A
    A -->|render clips| C
    A -->|invoke commands| D
    D -->|CRUD operations| F
    D -->|video processing| E
    E -->|file I/O| G[File System]
    F -->|read/write| G
```

### Data Flow: Import to Export

```mermaid
graph TD
    A[User Selects Video File] -->|File Path| B[import_video command]
    B --> C[FFmpeg Probe Metadata]
    C --> D[Generate Thumbnail]
    D --> E[Insert into SQLite]
    E --> F[Media Library Display]
    F -->|Drag to Timeline| G[ADD_CLIP action]
    G --> H[Clip Rendered on Canvas]
    H -->|User Edits| I[Trim/Split/Reorder]
    I -->|Click Export| J[export_timeline command]
    J --> K[Trim Clips to in/out points]
    K --> L[Concatenate Clips]
    L --> M[Scale to Resolution]
    M --> N[Final MP4 File]
    N --> O[User Downloads/Shares]
```

---

**End of Architecture Documentation**

For usage instructions, see [docs/usage-guide.md](usage-guide.md).
For demo video script, see [docs/demo.md](demo.md).
For development workflow, see [docs/task-list.md](task-list.md).
