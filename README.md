# ClipForge - Desktop Video Editor

A native desktop video editing application built with Tauri, Preact, Konva.js, FFmpeg, and SQLite. Record your screen and webcam, edit on a timeline, and export professional-quality videos.

## Features

- **Screen Recording** - Capture full screen or specific windows
- **Webcam Recording** - Record from your camera with audio
- **Timeline Editor** - Drag, trim, split, and arrange clips visually
- **Video Preview** - Real-time preview with playback controls
- **Multi-track Support** - Layer videos with picture-in-picture overlays
- **Professional Export** - Export to MP4 with customizable quality settings
- **Media Library** - Organize and manage your imported media

## Tech Stack

- **Tauri 1.x** - Rust-based desktop framework for small bundle size and native performance
- **Preact** - Lightweight React alternative (3KB) for fast UI rendering
- **Konva.js** - Canvas-based timeline rendering with drag-and-drop
- **FFmpeg** - Industry-standard video processing and encoding
- **SQLite** - Embedded database for media library and project persistence

## Prerequisites

- **Node.js** 18+ and npm
- **Rust** 1.70+ (install from [rustup.rs](https://rustup.rs))
- **System Requirements**:
  - Windows 10/11 or macOS 11+
  - 4GB RAM minimum (8GB recommended)

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd cautious-telegram
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode:**
   ```bash
   npm run tauri:dev
   ```
   This will start the Vite dev server and launch the Tauri application with hot reload.

## Build for Production

1. **Build the application:**
   ```bash
   npm run tauri:build
   ```

2. **Find the installer:**
   - Windows: `src-tauri/target/release/bundle/msi/ClipForge_0.1.0_x64_en-US.msi`
   - macOS: `src-tauri/target/release/bundle/dmg/ClipForge_0.1.0_x64.dmg`

## Project Structure

```
cautious-telegram/
├── src/                    # Preact frontend
│   ├── App.jsx            # Root component
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles (Tailwind)
├── src-tauri/             # Rust backend
│   ├── src/
│   │   └── main.rs        # Tauri entry point
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── index.html             # HTML template
├── package.json           # Node dependencies
└── vite.config.js         # Vite configuration
```

## Development Workflow

This project uses a multi-agent coordination system. For details on the development workflow:

- See `docs/prd.md` for the Product Requirements Document
- See `docs/task-list.md` for the PR task breakdown
- See `.claude/` directory for agent coordination rules

## Contributing

This project is under active development. PRs are implemented incrementally using the task list in `docs/task-list.md`.

## License

MIT