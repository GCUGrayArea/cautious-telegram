# FFmpeg Binary Setup

ClipForge requires FFmpeg for video processing operations (metadata extraction, thumbnail generation, video export). This document explains how to obtain and configure FFmpeg binaries for development and production.

## Quick Setup (Development)

### Windows

1. Download the latest **static** FFmpeg build from gyan.dev:
   - Visit: https://www.gyan.dev/ffmpeg/builds/
   - Download: `ffmpeg-release-essentials.zip` (or `ffmpeg-release-full.zip` for maximum codec support)
   - Extract the archive

2. Copy and rename FFmpeg binaries to the project:
   ```bash
   # Create binaries directory (if it doesn't exist)
   mkdir src-tauri\binaries

   # Copy and rename ffmpeg.exe and ffprobe.exe from the extracted archive
   # They should be in: ffmpeg-X.X.X-essentials_build\bin\
   # Tauri requires platform-specific naming: {name}-x86_64-pc-windows-msvc.exe
   copy path\to\ffmpeg-X.X.X-essentials_build\bin\ffmpeg.exe src-tauri\binaries\ffmpeg-x86_64-pc-windows-msvc.exe
   copy path\to\ffmpeg-X.X.X-essentials_build\bin\ffprobe.exe src-tauri\binaries\ffprobe-x86_64-pc-windows-msvc.exe
   ```

3. Verify the binaries are in place:
   ```bash
   dir src-tauri\binaries
   # Should show: ffmpeg-x86_64-pc-windows-msvc.exe, ffprobe-x86_64-pc-windows-msvc.exe
   ```

### macOS

1. Download static FFmpeg builds from evermeet.cx:
   - Visit: https://evermeet.cx/ffmpeg/
   - Download: `ffmpeg` (click the download button for the static build)
   - Download: `ffprobe` (separate download, also static build)
   - Extract the .7z or .zip files

2. Copy and rename FFmpeg binaries to the project:
   ```bash
   # Create binaries directory
   mkdir -p src-tauri/binaries

   # Copy and rename binaries (Tauri requires platform-specific names)
   # For Intel Macs:
   cp path/to/ffmpeg src-tauri/binaries/ffmpeg-x86_64-apple-darwin
   cp path/to/ffprobe src-tauri/binaries/ffprobe-x86_64-apple-darwin

   # For Apple Silicon Macs:
   cp path/to/ffmpeg src-tauri/binaries/ffmpeg-aarch64-apple-darwin
   cp path/to/ffprobe src-tauri/binaries/ffprobe-aarch64-apple-darwin

   # Make binaries executable
   chmod +x src-tauri/binaries/*
   ```

3. Verify the binaries:
   ```bash
   ls -l src-tauri/binaries
   # Intel Mac should show: ffmpeg-x86_64-apple-darwin, ffprobe-x86_64-apple-darwin
   # ARM Mac should show: ffmpeg-aarch64-apple-darwin, ffprobe-aarch64-apple-darwin
   ```

## Binary Locations and Naming

Tauri requires platform-specific binary names. The binaries should be placed in:
```
src-tauri/
  binaries/
    # Windows (x86_64)
    ffmpeg-x86_64-pc-windows-msvc.exe
    ffprobe-x86_64-pc-windows-msvc.exe

    # macOS Intel (x86_64)
    ffmpeg-x86_64-apple-darwin
    ffprobe-x86_64-apple-darwin

    # macOS Apple Silicon (aarch64)
    ffmpeg-aarch64-apple-darwin
    ffprobe-aarch64-apple-darwin
```

**Important**: The naming convention `{binary}-{arch}-{vendor}-{os}-{abi}` is required by Tauri's `externalBin` feature.

## Why Static Binaries?

- **No dependencies**: Static builds include all required libraries
- **Consistent behavior**: Same codec support across all installations
- **Easy distribution**: Bundle directly with the app
- **No installation required**: Users don't need to install FFmpeg separately

## Binary Sizes

- Windows: ~70-120 MB per binary (ffmpeg.exe, ffprobe.exe)
- macOS: ~80-100 MB per binary

**Note**: These binaries are NOT committed to git (see `.gitignore`). Each developer must download them separately.

## Production Bundling

Tauri's `externalBin` feature automatically bundles these binaries with the production build. The build process:

1. Detects binaries in `src-tauri/binaries/`
2. Bundles them with the application
3. Sets correct permissions (executable on Unix-like systems)
4. Makes them accessible at runtime via Tauri's resource resolution

The Rust code uses `tauri::api::process::Command::new_sidecar()` to locate and execute the bundled binaries.

## Troubleshooting

### Binary not found at runtime

**Symptoms**: "ffmpeg binary not found" error when running the app

**Solutions**:
- Verify `src-tauri/binaries/ffmpeg.exe` (Windows) or `ffmpeg-*-darwin` (macOS) exists
- Check `tauri.conf.json` includes `externalBin` configuration
- Ensure binary has correct permissions on macOS/Linux: `chmod +x src-tauri/binaries/*`

### Wrong architecture

**Symptoms**: "Bad CPU type in executable" (macOS) or similar architecture mismatch errors

**Solutions**:
- macOS Intel: Use `x86_64-apple-darwin` binaries
- macOS Apple Silicon: Use `aarch64-apple-darwin` binaries
- Windows: Use 64-bit (x64) binaries

### Missing codecs

**Symptoms**: "Unknown decoder" or "No decoder for codec X" errors

**Solutions**:
- Use the "full" build instead of "essentials" (Windows: `ffmpeg-release-full.zip`)
- Verify the static build includes the required codecs (H.264, AAC, VP8, VP9)

## Additional Resources

- FFmpeg Documentation: https://ffmpeg.org/documentation.html
- Tauri External Binaries Guide: https://tauri.app/v1/guides/building/sidecar
- Gyan.dev FFmpeg Builds (Windows): https://www.gyan.dev/ffmpeg/builds/
- Evermeet.cx FFmpeg Builds (macOS): https://evermeet.cx/ffmpeg/
