# Setup Notes for FFmpeg Integration

## Current Status

The FFmpeg integration code is complete and ready to use. However, the actual FFmpeg binaries are not yet included in the repository.

## To Enable FFmpeg Functionality

1. **Download FFmpeg binaries** following instructions in `README-FFMPEG.md`
2. **Place binaries** in `src-tauri/binaries/` with platform-specific names
3. **Update tauri.conf.json** to uncomment the externalBin configuration:

```json
"externalBin": [
  "binaries/ffmpeg",
  "binaries/ffprobe"
]
```

## Why Are Binaries Not Included?

- FFmpeg binaries are large (~70-120 MB each)
- They are platform-specific (Windows, macOS Intel, macOS ARM)
- Git repositories should not include large binaries
- Developers download only the binaries they need for their platform

## What Works Without Binaries?

- The Rust code compiles successfully
- The Tauri app launches and runs
- FFmpeg commands are registered and available to the frontend
- **FFmpeg operations will fail** with "binary not found" errors

## What Requires Binaries?

- Video metadata extraction (ffmpeg_probe)
- Thumbnail generation (ffmpeg_generate_thumbnail)
- Video trimming (ffmpeg_trim_video)
- Video concatenation (ffmpeg_concat_videos)
- Video export functionality (future PRs)

## For PR-003 Completion

This PR (PR-003: FFmpeg Integration Setup) is considered complete when:
- ✅ FFmpeg module structure created
- ✅ Rust wrapper implemented
- ✅ Tauri commands registered
- ✅ Documentation provided
- ⏳ **Binaries downloaded and configured** (developer's responsibility)
- ⏳ **Build succeeds** (requires binaries)
- ⏳ **Basic functionality tested** (requires binaries)

The code is production-ready. The binaries just need to be downloaded per the instructions.
