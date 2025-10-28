// Export command for Tauri
use std::sync::{Arc, Mutex};
use tauri::State;

use crate::export::{ExportPipeline, ExportSettings};
use crate::export::pipeline::ClipData;
use crate::ffmpeg::FFmpegWrapper;

/// Tauri command to export timeline to video file
///
/// Takes timeline clips and export settings from frontend,
/// processes them through ExportPipeline, and returns output path.
#[tauri::command]
pub fn export_timeline(
    clips: Vec<ClipData>,
    settings: ExportSettings,
    ffmpeg_state: State<'_, Arc<Mutex<FFmpegWrapper>>>,
) -> Result<String, String> {
    // Create export pipeline
    let pipeline = ExportPipeline::new(ffmpeg_state.inner().clone());

    // Execute export (blocking operation)
    pipeline.export_timeline(clips, settings)
}
