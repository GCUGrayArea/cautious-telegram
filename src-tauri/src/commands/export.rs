// Export command for Tauri
use tauri::State;

use crate::export::{ExportPipeline, ExportSettings};
use crate::export::pipeline::ClipData;
use crate::ffmpeg::commands::FFmpegState;

/// Tauri command to export timeline to video file
///
/// Takes timeline clips and export settings from frontend,
/// processes them through ExportPipeline, and returns output path.
#[tauri::command]
pub fn export_timeline(
    clips: Vec<ClipData>,
    settings: ExportSettings,
    ffmpeg_state: State<'_, FFmpegState>,
) -> Result<String, String> {
    // Get FFmpeg wrapper from state
    let ffmpeg_wrapper = ffmpeg_state.get_wrapper()?;

    // Create export pipeline
    let pipeline = ExportPipeline::new(std::sync::Arc::new(std::sync::Mutex::new(ffmpeg_wrapper)));

    // Execute export (blocking operation)
    pipeline.export_timeline(clips, settings)
}
