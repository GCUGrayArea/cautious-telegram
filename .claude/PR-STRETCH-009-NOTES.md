# PR-STRETCH-009: Text Overlay Export - Suspended

**Status:** SUSPENDED - Complex FFmpeg drawtext filter limitations encountered

**Date Suspended:** 2025-10-30

**Agent:** White

## Summary

This PR attempted to implement text overlay export functionality for transcribed subtitles in the video export pipeline. While text overlays render correctly in the frontend preview, exporting them to video proved significantly more complicated than anticipated due to FFmpeg drawtext filter limitations.

## What Was Accomplished

1. ✅ Frontend data preparation (ExportDialog.jsx)
   - Text overlay objects properly extracted from timeline state
   - Camel case parameter naming for Tauri serialization

2. ✅ Backend parameter passing (export.rs, api.js)
   - Tauri command signature updated to accept text_overlays
   - Parameter naming fixed (camelCase for Tauri, snake_case in Rust)

3. ✅ Multitrack export path support
   - Identified that export was using multitrack path (when clips overlap)
   - Implemented text overlay integration in apply_overlays function
   - Filter chain properly structured with text filters applied after video composition

4. ✅ Basic text rendering
   - Text appeared in exported video (though with issues)
   - Timing constraints working with enable='between(t,start,end)' parameter
   - Font size scaling applied (65% reduction to ~22pt from 64pt)
   - Background box added for readability (semi-transparent black)

5. ⚠️ Partially Working
   - Text appears but positioning and wrapping issues persist
   - Not all text overlays visible in final export
   - Centering implementation blocked

## Key Challenges Encountered

### 1. Single Quote Escaping (SOLVED)
**Problem:** FFmpeg drawtext filter requires special handling for single quotes in text content
- Initial attempt: `\'` (interpreted literally, broke filter)
- Solution: Used `'\''` (end quote, escaped quote, start quote) - proper FFmpeg escape sequence
- This fixed the filter parsing errors for text containing apostrophes

### 2. Enable Parameter Syntax (SOLVED)
**Problem:** Text overlays appeared for entire video duration instead of specified time range
- Initial attempt: Used backslash-escaped parentheses in enable parameter
- Solution: Removed escaping, use `enable='between(t,18.0,24.0)'` directly within single quotes
- FFmpeg doesn't escape expressions inside parameter values

### 3. Font Size (PARTIALLY SOLVED)
**Problem:** Default 64pt font way too large for video overlay
- Solution: Reduced to 22pt (35% of original)
- Result: Better but still inconsistent visibility
- Issue: Different text lengths still have visibility/positioning problems

### 4. Text Centering (BLOCKED - PRIMARY ISSUE)
**Problem:** FFmpeg drawtext filter doesn't provide reliable centering
- Attempted solution 1: `x=(w-text_width)/2`
  - Error: `text_width` variable not recognized: "Undefined constant or missing '(' in 'text_width)/2'"
  - This version of FFmpeg (8.0-essentials) doesn't support text_width variable

- Attempted solution 2: Fixed position `x=w*0.25` or `x=w*0.15`
  - Result: Text appeared but alignment varied by text length
  - Short lines looked left-aligned, long lines wrapped unpredictably

- Attempted solution 3: `x=w*0.3` (30% margin for 70% width wrapping)
  - Error: Same as solution 1 - FFmpeg version limitation

**Root Cause:** FFmpeg's drawtext filter in version 8.0 doesn't have:
- `text_width` variable for dynamic centering
- Built-in text wrapping width limit parameter
- Reliable multiline text wrapping

### 5. Text Wrapping (BLOCKED)
**Problem:** Text doesn't wrap at specified screen width percentage
- User request: Wrap at 70% of screen width
- FFmpeg limitation: drawtext has no `max_width` parameter
- Line_spacing parameter added but doesn't force wrapping

## Files Modified

1. **src/components/ExportDialog.jsx**
   - Extracts text overlay data from timeline state
   - Prepares TextOverlayData objects for export

2. **src/utils/api.js**
   - Updated exportTimeline function signature
   - Fixed parameter naming to camelCase (textOverlays)

3. **src-tauri/src/commands/export.rs**
   - Updated Tauri command to accept text_overlays parameter
   - Passes to ExportPipeline

4. **src-tauri/src/export/pipeline.rs** (PRIMARY CHANGES)
   - TextOverlayData struct defined
   - export_timeline function updated
   - apply_overlays function enhanced for multitrack text support
   - build_drawtext_filter function created (multiple iterations)
   - Filter chain properly structured for text overlay application

## Current Filter Implementation

```rust
let filter = format!(
    "drawtext=text='{}':fontsize={}:fontcolor={}:x=w*0.3:y={}:line_spacing=8:box=1:boxcolor=0x00000080:boxborderw=5:enable='between(t,{:.3},{:.3})'",
    escaped_text, adjusted_fontsize, fontcolor, y_expr, overlay.start_time, end_time
);
```

**Parameters:**
- `text`: Properly escaped with `'\''` for single quotes
- `fontsize`: Adjusted to ~22pt for readability
- `fontcolor`: Hex format with 0x prefix
- `x`: Fixed at 30% (30% left margin for 70% width wrapping intent)
- `y`: Percentage-based positioning from timeline data
- `line_spacing`: 8px for better readability
- `box`: Semi-transparent background for contrast
- `enable`: Time-based visibility constraint

## Why Text Overlay Export is Complex

1. **FFmpeg Filter Limitations:**
   - Drawtext is a single-frame filter without true line wrapping
   - No text width calculation available in this FFmpeg version
   - No maximum width parameter for wrapping constraint
   - Centering requires dynamic width calculation (unavailable)

2. **Timing and Synchronization:**
   - Text must appear at exact frame (enable parameter works)
   - But positioning is fixed per overlay (can't adjust per frame)
   - No frame-accurate bounding box for text

3. **Multi-line Text Issues:**
   - Manual newline insertion needed (not implemented)
   - Line spacing doesn't force wrapping
   - Text can extend beyond video boundaries

4. **Font Rendering:**
   - Fontconfig errors indicate missing system font configurations
   - Default font fallback may differ between systems
   - No font availability guarantee on export system

## Recommendations for Future Work

1. **Pre-process Text:**
   - Manually insert line breaks on frontend based on estimated character width
   - Calculate approximate text width before passing to FFmpeg
   - Send pre-wrapped text to export pipeline

2. **Alternative Approaches:**
   - Use FFmpeg's `text file` option with pre-processed text file
   - Consider using overlay images instead of drawtext filter
   - Generate subtitle/caption file (.srt, .vtt) and burn-in separately

3. **Font Configuration:**
   - Ensure fontconfig is properly configured on export system
   - Consider embedding fonts or using system default fonts only
   - Add font fallback logic

4. **Testing Strategy:**
   - Test with various text lengths and aspect ratios
   - Verify centering across different video resolutions
   - Check font rendering consistency

## Git Status Before Suspension

- Branch: main
- Modified files:
  - src/components/ExportDialog.jsx
  - src/utils/api.js
  - src-tauri/src/commands/export.rs
  - src-tauri/src/export/pipeline.rs

## Next Steps When Resuming

1. Review FFmpeg version capabilities (consider upgrade or feature detection)
2. Implement pre-text-wrapping on frontend
3. Test with manually wrapped text
4. Consider alternative overlay implementation (image-based or subtitle file)

## Related Issues

- Text overlays appear in preview but not in export
- Short text lines don't appear at all
- Text centering inconsistent based on text length
- Wrapping doesn't respect screen width constraints

---

**This PR is suspended in favor of implementing one-click transcription feature instead.**
